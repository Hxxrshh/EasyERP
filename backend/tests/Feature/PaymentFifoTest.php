<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Services\PaymentFifoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentFifoTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_payment_allocates_completely_to_single_invoice(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'date'            => '2026-08-01',
            'total_amount'    => 500.00,
            'paid_amount'     => 0.00,
        ]);

        $payment = Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'amount'          => 500.00,
        ]);

        $fifoService = new PaymentFifoService();
        $fifoService->allocate($payment);

        $invoice->refresh();

        $this->assertEquals(500.00, $invoice->paid_amount);
        $this->assertDatabaseHas('payment_invoice_map', [
            'payment_id'     => $payment->id,
            'invoice_id'     => $invoice->id,
            'amount_applied' => 500.00,
        ]);
    }

    public function test_partial_payment_partially_allocates_to_invoice(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'date'            => '2026-08-01',
            'total_amount'    => 1000.00,
            'paid_amount'     => 0.00,
        ]);

        $payment = Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'amount'          => 400.00,
        ]);

        $fifoService = new PaymentFifoService();
        $fifoService->allocate($payment);

        $invoice->refresh();

        $this->assertEquals(400.00, $invoice->paid_amount);
        $this->assertDatabaseHas('payment_invoice_map', [
            'payment_id'     => $payment->id,
            'invoice_id'     => $invoice->id,
            'amount_applied' => 400.00,
        ]);
    }

    public function test_payment_spans_across_multiple_invoices_in_chronological_order(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Older invoice 1
        $inv1 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'date'            => '2026-08-01',
            'total_amount'    => 300.00,
            'paid_amount'     => 0.00,
        ]);

        // Newer invoice 2
        $inv2 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'date'            => '2026-08-05',
            'total_amount'    => 400.00,
            'paid_amount'     => 0.00,
        ]);

        // Payment of 500 should fully pay inv1 (300) and partially pay inv2 (200)
        $payment = Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'amount'          => 500.00,
        ]);

        $fifoService = new PaymentFifoService();
        $fifoService->allocate($payment);

        $inv1->refresh();
        $inv2->refresh();

        $this->assertEquals(300.00, $inv1->paid_amount);
        $this->assertEquals(200.00, $inv2->paid_amount);

        $this->assertDatabaseHas('payment_invoice_map', [
            'payment_id'     => $payment->id,
            'invoice_id'     => $inv1->id,
            'amount_applied' => 300.00,
        ]);

        $this->assertDatabaseHas('payment_invoice_map', [
            'payment_id'     => $payment->id,
            'invoice_id'     => $inv2->id,
            'amount_applied' => 200.00,
        ]);
    }

    public function test_already_paid_invoices_are_skipped(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Fully paid older invoice
        $fullyPaid = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'date'            => '2026-08-01',
            'total_amount'    => 200.00,
            'paid_amount'     => 200.00,
        ]);

        // Unpaid newer invoice
        $unpaid = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'date'            => '2026-08-05',
            'total_amount'    => 500.00,
            'paid_amount'     => 0.00,
        ]);

        $payment = Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'amount'          => 150.00,
        ]);

        $fifoService = new PaymentFifoService();
        $fifoService->allocate($payment);

        $fullyPaid->refresh();
        $unpaid->refresh();

        $this->assertEquals(200.00, $fullyPaid->paid_amount);
        $this->assertEquals(150.00, $unpaid->paid_amount);

        $this->assertDatabaseMissing('payment_invoice_map', [
            'payment_id' => $payment->id,
            'invoice_id' => $fullyPaid->id,
        ]);

        $this->assertDatabaseHas('payment_invoice_map', [
            'payment_id'     => $payment->id,
            'invoice_id'     => $unpaid->id,
            'amount_applied' => 150.00,
        ]);
    }

    public function test_payment_cannot_allocate_beyond_invoice_outstanding_amount(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'date'            => '2026-08-01',
            'total_amount'    => 250.00,
            'paid_amount'     => 0.00,
        ]);

        // Overpayment of 500 against 250 invoice
        $payment = Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'amount'          => 500.00,
        ]);

        $fifoService = new PaymentFifoService();
        $fifoService->allocate($payment);

        $invoice->refresh();

        // Invoice paid amount should cap exactly at total_amount (250.00)
        $this->assertEquals(250.00, $invoice->paid_amount);

        $this->assertDatabaseHas('payment_invoice_map', [
            'payment_id'     => $payment->id,
            'invoice_id'     => $invoice->id,
            'amount_applied' => 250.00,
        ]);
    }
}
