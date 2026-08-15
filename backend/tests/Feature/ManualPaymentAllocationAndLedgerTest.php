<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\User;
use App\Services\PaymentFifoService;
use App\Services\PaymentStatusService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManualPaymentAllocationAndLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser($org, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_valid_manual_payment_allocation_success(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'total_amount'    => 1000.00,
            'paid_amount'     => 0.00,
        ]);

        $payment = Payment::factory()->create([
            'organization_id'    => $org->id,
            'client_id'          => $client->id,
            'amount'             => 1000.00,
            'unallocated_amount' => 1000.00,
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/payments/{$payment->id}/allocate", [
                'invoice_id' => $invoice->id,
                'amount'     => 400.00,
            ]);

        $response->assertStatus(200);
        $this->assertEquals(400.00, $response->json('total_allocated'));
        $this->assertEquals(600.00, $response->json('unallocated_amount'));
        $this->assertEquals(600.00, $response->json('invoice_outstanding_amount'));

        $this->assertEquals(400.00, $invoice->fresh()->paid_amount);
        $this->assertEquals(600.00, $payment->fresh()->unallocated_amount);
    }

    public function test_manual_allocation_exceeding_invoice_outstanding_is_rejected(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'total_amount'    => 300.00,
            'paid_amount'     => 0.00,
        ]);

        $payment = Payment::factory()->create([
            'organization_id'    => $org->id,
            'client_id'          => $client->id,
            'amount'             => 1000.00,
            'unallocated_amount' => 1000.00,
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/payments/{$payment->id}/allocate", [
                'invoice_id' => $invoice->id,
                'amount'     => 500.00,
            ]);

        $response->assertStatus(422);
    }

    public function test_manual_allocation_exceeding_unallocated_payment_balance_is_rejected(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'total_amount'    => 1000.00,
            'paid_amount'     => 0.00,
        ]);

        $payment = Payment::factory()->create([
            'organization_id'    => $org->id,
            'client_id'          => $client->id,
            'amount'             => 1000.00,
            'unallocated_amount' => 200.00,
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/payments/{$payment->id}/allocate", [
                'invoice_id' => $invoice->id,
                'amount'     => 500.00,
            ]);

        $response->assertStatus(422);
    }

    public function test_auditor_cannot_manually_allocate_payment(): void
    {
        $org = Organization::factory()->create();
        $auditor = $this->authenticateUser($org, 'auditor');

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $invoice = Invoice::factory()->create(['organization_id' => $org->id, 'client_id' => $client->id, 'status' => 'finalized']);
        $payment = Payment::factory()->create(['organization_id' => $org->id, 'client_id' => $client->id, 'unallocated_amount' => 500]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/payments/{$payment->id}/allocate", [
                'invoice_id' => $invoice->id,
                'amount'     => 100.00,
            ]);

        $response->assertStatus(403);
    }

    public function test_fifo_followed_by_manual_allocation_uses_remaining_unallocated_amount(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Inv 1: 600 (only finalized invoice prior to payment)
        $inv1 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-01',
            'total_amount'    => 600.00,
            'paid_amount'     => 0.00,
        ]);

        // Payment of 1000. FIFO allocates 600 to inv1 and leaves 400 unallocated.
        $payment = Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'amount'          => 1000.00,
        ]);

        $fifoService = new PaymentFifoService();
        $fifoService->allocate($payment);

        $payment->refresh();
        $this->assertEquals(400.00, $payment->unallocated_amount);

        // Later, Inv 2 is created and finalized (1000)
        $inv2 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-10',
            'total_amount'    => 1000.00,
            'paid_amount'     => 0.00,
        ]);

        // Manually allocate 300 of remaining 400 unallocated payment balance to Inv 2
        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/payments/{$payment->id}/allocate", [
                'invoice_id' => $inv2->id,
                'amount'     => 300.00,
            ]);

        $response->assertStatus(200);

        $this->assertEquals(600.00, $inv1->fresh()->paid_amount);
        $this->assertEquals(300.00, $inv2->fresh()->paid_amount);
        $this->assertEquals(100.00, $payment->fresh()->unallocated_amount);
    }

    public function test_payment_status_calculations(): void
    {
        $statusService = new PaymentStatusService();

        // Paid: total = 500, paid = 500
        $paidInv = new Invoice(['total_amount' => 500, 'paid_amount' => 500, 'due_date' => '2026-08-01']);
        $this->assertEquals('Paid', $statusService->getPaymentStatus($paidInv));

        // Partial: total = 500, paid = 200
        $partialInv = new Invoice(['total_amount' => 500, 'paid_amount' => 200, 'due_date' => '2026-08-01']);
        $this->assertEquals('Partial', $statusService->getPaymentStatus($partialInv));

        // Overdue: total = 500, paid = 0, due_date = 2026-08-01, current = 2026-08-15
        $overdueInv = new Invoice(['total_amount' => 500, 'paid_amount' => 0, 'due_date' => '2026-08-01']);
        $this->assertEquals('Overdue', $statusService->getPaymentStatus($overdueInv, Carbon::parse('2026-08-15')));

        // Pending: total = 500, paid = 0, due_date = 2026-08-30, current = 2026-08-15
        $pendingInv = new Invoice(['total_amount' => 500, 'paid_amount' => 0, 'due_date' => '2026-08-30']);
        $this->assertEquals('Pending', $statusService->getPaymentStatus($pendingInv, Carbon::parse('2026-08-15')));
    }

    public function test_authoritative_ledger_statement_and_date_range_filtering(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Historical Inv 1 (April 10, 2026): 1000.00
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-04-10',
            'total_amount'    => 1000.00,
            'paid_amount'     => 1000.00,
        ]);

        // Historical Payment 1 (April 15, 2026): 400.00
        Payment::factory()->create([
            'organization_id'    => $org->id,
            'client_id'          => $client->id,
            'payment_date'       => '2026-04-15',
            'amount'             => 400.00,
            'unallocated_amount' => 0.00,
        ]);

        // In-range Inv 2 (May 10, 2026): 500.00
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-05-10',
            'total_amount'    => 500.00,
            'paid_amount'     => 0.00,
        ]);

        // Draft invoice (must NOT appear in ledger)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'draft',
            'date'            => '2026-05-12',
            'total_amount'    => 999.00,
        ]);

        // Proforma (must NOT appear in ledger)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'proforma',
            'status'          => 'finalized',
            'date'            => '2026-05-14',
            'total_amount'    => 888.00,
        ]);

        // Query with date range: from = 2026-05-01 to = 2026-05-31
        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/ledgers/{$client->id}?from=2026-05-01&to=2026-05-31");

        $response->assertStatus(200);

        // Opening balance prior to May 1 = 1000 (debit) - 400 (credit) = 600.00
        $this->assertEquals(600.00, $response->json('opening_balance'));

        // Current overall outstanding = (1000 + 500) - 400 = 1100.00
        $this->assertEquals(1100.00, $response->json('current_outstanding'));

        // Statement should contain only 1 entry (Inv 2)
        $statement = $response->json('statement');
        $this->assertCount(1, $statement);

        // Running balance for Inv 2 entry = opening 600 + 500 debit = 1100.00
        $this->assertEquals(1100.00, $statement[0]['running_balance']);
    }
}
