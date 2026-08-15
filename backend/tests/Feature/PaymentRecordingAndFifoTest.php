<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\User;
use App\Services\PaymentFifoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentRecordingAndFifoTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser($org, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_unauthenticated_payment_recording_is_rejected(): void
    {
        $this->postJson('/api/v1/payments', [
            'client_id'    => 1,
            'amount'       => 100.00,
            'payment_date' => '2026-08-15',
            'payment_mode' => 'UPI',
        ])->assertStatus(401);
    }

    public function test_valid_payment_recording_allocates_successfully(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'total_amount'    => 500.00,
            'paid_amount'     => 0.00,
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/payments', [
                'client_id'             => $client->id,
                'amount'                => 500.00,
                'payment_date'          => '2026-08-15',
                'payment_mode'          => 'Bank Transfer',
                'transaction_reference' => 'TXN999',
            ]);

        $response->assertStatus(201);
        $this->assertEquals(500.00, $response->json('allocated_amount'));
        $this->assertEquals(0.00, $response->json('unallocated_amount'));
        $this->assertEquals(500.00, $invoice->fresh()->paid_amount);
    }

    public function test_zero_or_negative_payment_amount_is_rejected(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/payments', [
                'client_id'    => $client->id,
                'amount'       => 0.00,
                'payment_date' => '2026-08-15',
                'payment_mode' => 'UPI',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);
    }

    public function test_payment_for_another_organizations_client_is_rejected(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $this->authenticateUser($org1);
        $clientOrg2 = Client::factory()->create(['organization_id' => $org2->id]);

        $response = $this->withHeader('X-Organization-Id', $org1->id)
            ->postJson('/api/v1/payments', [
                'client_id'    => $clientOrg2->id,
                'amount'       => 100.00,
                'payment_date' => '2026-08-15',
                'payment_mode' => 'UPI',
            ]);

        $response->assertStatus(403);
    }

    public function test_fifo_allocates_oldest_first_and_ignores_drafts_quotes_and_cancelled(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Draft invoice (must be ignored)
        $draft = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'draft',
            'date'            => '2026-08-01',
            'total_amount'    => 500.00,
        ]);

        // Quote (must be ignored)
        $quote = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'quote',
            'status'          => 'finalized',
            'date'            => '2026-08-02',
            'total_amount'    => 500.00,
        ]);

        // Cancelled invoice (must be ignored)
        $cancelled = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'cancelled',
            'date'            => '2026-08-03',
            'total_amount'    => 500.00,
        ]);

        // Oldest valid tax invoice
        $oldest = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-05',
            'total_amount'    => 300.00,
            'paid_amount'     => 0.00,
        ]);

        // Newer valid tax invoice
        $newer = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-10',
            'total_amount'    => 400.00,
            'paid_amount'     => 0.00,
        ]);

        // Record payment of 500.00
        $payment = Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'amount'          => 500.00,
        ]);

        $fifoService = new PaymentFifoService();
        $fifoService->allocate($payment);

        // Assertions
        $this->assertEquals(0.00, $draft->fresh()->paid_amount);
        $this->assertEquals(0.00, $quote->fresh()->paid_amount);
        $this->assertEquals(0.00, $cancelled->fresh()->paid_amount);

        // Oldest invoice (300) should be fully paid
        $this->assertEquals(300.00, $oldest->fresh()->paid_amount);

        // Newer invoice (400) should receive remaining 200
        $this->assertEquals(200.00, $newer->fresh()->paid_amount);

        // Unallocated balance should be 0.00
        $this->assertEquals(0.00, $payment->fresh()->unallocated_amount);
    }

    public function test_excess_payment_preserves_unallocated_amount(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-01',
            'total_amount'    => 200.00,
            'paid_amount'     => 0.00,
        ]);

        // Payment of 500 against 200 outstanding
        $payment = Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'amount'          => 500.00,
        ]);

        $fifoService = new PaymentFifoService();
        $fifoService->allocate($payment);

        $invoice->refresh();
        $payment->refresh();

        // Invoice paid_amount should cap at total (200.00)
        $this->assertEquals(200.00, $invoice->paid_amount);

        // Payment unallocated_amount should store remaining 300.00
        $this->assertEquals(300.00, $payment->unallocated_amount);

        // Original payment amount remains untouched (500.00)
        $this->assertEquals(500.00, $payment->amount);
    }
}
