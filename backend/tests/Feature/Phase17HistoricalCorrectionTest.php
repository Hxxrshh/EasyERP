<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Client;
use App\Models\InventoryTransaction;
use App\Models\Invoice;
use App\Models\InvoiceCorrection;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase17HistoricalCorrectionTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $adminUser;
    protected User $operatorUser;
    protected Client $client;
    protected Product $product;
    protected Invoice $finalizedInvoice;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::factory()->create(['name' => 'Apex Industrial Corp', 'state' => 'Gujarat']);

        $this->adminUser = User::factory()->create();
        $this->adminUser->organizations()->attach($this->org->id, ['role' => 'admin']);

        $this->operatorUser = User::factory()->create();
        $this->operatorUser->organizations()->attach($this->org->id, ['role' => 'operator']);

        $this->client = Client::factory()->create([
            'organization_id' => $this->org->id,
            'name'            => 'RR Packaging',
            'state'           => 'Gujarat',
        ]);

        $this->product = Product::factory()->create([
            'organization_id'  => $this->org->id,
            'name'             => 'HDPE Granules',
            'base_price'       => 100.00,
            'default_gst_rate' => 18.00,
        ]);

        // Create initial stock of 500 KGS
        InventoryTransaction::create([
            'organization_id' => $this->org->id,
            'product_id'      => $this->product->id,
            'quantity'        => 500,
            'unit'            => 'KGS',
            'type'            => 'stock_in',
            'date'            => date('Y-m-d'),
            'reference'       => 'INIT-STOCK',
            'notes'           => 'Initial stock setup',
        ]);

        // Create & Finalize Invoice for 100 KGS @ ₹100 = ₹10,000 subtotal + ₹1,800 GST = ₹11,800 total
        $this->finalizedInvoice = Invoice::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
            'status'          => 'finalized',
            'invoice_number'  => 'INV-2026-001',
            'subtotal'        => 10000.00,
            'cgst_total'      => 900.00,
            'sgst_total'      => 900.00,
            'igst_total'      => 0.00,
            'total_gst'       => 1800.00,
            'total_amount'    => 11800.00,
            'finalized_at'    => now(),
        ]);

        InvoiceItem::create([
            'invoice_id'     => $this->finalizedInvoice->id,
            'product_id'     => $this->product->id,
            'quantity'       => 100,
            'rate'           => 100.00,
            'gst_rate'       => 18.00,
            'taxable_amount' => 10000.00,
            'cgst_amount'    => 900.00,
            'sgst_amount'    => 900.00,
            'igst_amount'    => 0.00,
            'amount'         => 11800.00,
        ]);
    }

    public function test_operator_can_request_correction_for_finalized_invoice(): void
    {
        $this->actingAs($this->operatorUser, 'sanctum');

        $res = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/invoices/{$this->finalizedInvoice->id}/request-correction", [
                'reason' => 'Incorrect quantity entered during dispatch entry.',
                'items'  => [
                    [
                        'product_id' => $this->product->id,
                        'quantity'   => 80,
                        'rate'       => 100.00,
                        'gst_rate'   => 18.00,
                    ],
                ],
            ]);

        $res->assertStatus(201);
        $res->assertJsonPath('status', 'requested');

        $correctionId = $res->json('id');
        $this->assertDatabaseHas('invoice_corrections', [
            'id'           => $correctionId,
            'requested_by' => $this->operatorUser->id,
            'status'       => 'requested',
        ]);
    }

    public function test_operator_self_approval_is_forbidden(): void
    {
        // 1. Operator requests correction
        $this->actingAs($this->operatorUser, 'sanctum');
        $reqRes = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/invoices/{$this->finalizedInvoice->id}/request-correction", [
                'reason' => 'Self approval test request.',
                'items'  => [
                    ['product_id' => $this->product->id, 'quantity' => 80, 'rate' => 100.00],
                ],
            ]);

        $corrId = $reqRes->json('id');

        // 2. Operator attempts approval -> 403 Forbidden (Non-admin)
        $appRes = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/corrections/{$corrId}/approve");
        $appRes->assertStatus(403);

        // 3. Even if operator attempts application -> 403 Forbidden
        $applyRes = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/corrections/{$corrId}/apply");
        $applyRes->assertStatus(403);
    }

    public function test_admin_approves_and_transactionally_applies_correction(): void
    {
        // 1. Operator requests correction (reduce qty from 100 to 80 KGS)
        $this->actingAs($this->operatorUser, 'sanctum');
        $reqRes = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/invoices/{$this->finalizedInvoice->id}/request-correction", [
                'reason' => 'Over-billed by 20 KGS.',
                'items'  => [
                    ['product_id' => $this->product->id, 'quantity' => 80, 'rate' => 100.00, 'gst_rate' => 18.00],
                ],
            ]);

        $corrId = $reqRes->json('id');

        // 2. Admin applies correction
        $this->actingAs($this->adminUser, 'sanctum');
        $applyRes = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/corrections/{$corrId}/apply");

        $applyRes->assertStatus(200);
        $applyRes->assertJsonPath('status', 'applied');

        // 3. Verify Invoice total updated from ₹11,800 to ₹9,440 (₹8,000 subtotal + ₹1,440 GST)
        $freshInvoice = $this->finalizedInvoice->fresh();
        $this->assertEquals(8000.00, (float) $freshInvoice->subtotal);
        $this->assertEquals(1440.00, (float) $freshInvoice->total_gst);
        $this->assertEquals(9440.00, (float) $freshInvoice->total_amount);

        // 4. Verify Inventory Stock Adjustment created (+20 KGS restored to inventory)
        $this->assertDatabaseHas('inventory_transactions', [
            'organization_id' => $this->org->id,
            'product_id'      => $this->product->id,
            'type'            => 'adjustment',
            'quantity'        => 20.00,
        ]);

        // 5. Verify Security Audit Event created
        $this->assertDatabaseHas('audit_logs', [
            'organization_id' => $this->org->id,
            'action'          => 'invoice_correction_applied',
        ]);
    }

    public function test_concurrent_double_application_is_prevented(): void
    {
        $this->actingAs($this->operatorUser, 'sanctum');
        $reqRes = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/invoices/{$this->finalizedInvoice->id}/request-correction", [
                'reason' => 'Double application test.',
                'items'  => [
                    ['product_id' => $this->product->id, 'quantity' => 90, 'rate' => 100.00, 'gst_rate' => 18.00],
                ],
            ]);
        $corrId = $reqRes->json('id');

        $this->actingAs($this->adminUser, 'sanctum');
        // First application
        $this->withHeader('X-Organization-Id', $this->org->id)->postJson("/api/v1/corrections/{$corrId}/apply")->assertStatus(200);

        // Second application attempt fails cleanly with 422
        $secondRes = $this->withHeader('X-Organization-Id', $this->org->id)->postJson("/api/v1/corrections/{$corrId}/apply");
        $secondRes->assertStatus(422);
    }

    public function test_paid_invoice_correction_recalculates_payments_and_credit_allocations(): void
    {
        // 1. Record payment of ₹11,800 fully paying invoice
        $payment = \App\Models\Payment::create([
            'organization_id'     => $this->org->id,
            'client_id'           => $this->client->id,
            'amount'              => 11800.00,
            'unallocated_amount'  => 0.00,
            'payment_date'        => date('Y-m-d'),
            'payment_mode'        => 'bank_transfer',
            'transaction_reference' => 'TXN-FULL-PAY',
        ]);

        \Illuminate\Support\Facades\DB::table('payment_invoice_map')->insert([
            'payment_id'     => $payment->id,
            'invoice_id'     => $this->finalizedInvoice->id,
            'amount_applied' => 11800.00,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $this->finalizedInvoice->update(['paid_amount' => 11800.00]);

        // 2. Request & apply correction reducing total to ₹9,440 (80 KGS)
        $this->actingAs($this->operatorUser, 'sanctum');
        $reqRes = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/invoices/{$this->finalizedInvoice->id}/request-correction", [
                'reason' => 'Overpaid invoice correction.',
                'items'  => [
                    ['product_id' => $this->product->id, 'quantity' => 80, 'rate' => 100.00, 'gst_rate' => 18.00],
                ],
            ]);
        $corrId = $reqRes->json('id');

        $this->actingAs($this->adminUser, 'sanctum');
        $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/corrections/{$corrId}/apply")
            ->assertStatus(200);

        // 3. Verify Invoice paid_amount capped at new total ₹9,440
        $freshInvoice = $this->finalizedInvoice->fresh();
        $this->assertEquals(9440.00, (float) $freshInvoice->total_amount);
        $this->assertEquals(9440.00, (float) $freshInvoice->paid_amount);

        // 4. Verify Payment unallocated_amount restored with ₹2,360 unallocated credit!
        $freshPayment = $payment->fresh();
        $this->assertEquals(2360.00, (float) $freshPayment->unallocated_amount);
    }
}
