<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Services\ReportDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaxModeTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_taxable_invoice_with_full_gst(): void
    {
        $org = Organization::factory()->create(['state' => 'Gujarat', 'gst_number' => '24AAAAA0000A1Z5']);
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id, 'state' => 'Gujarat']);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 100.00, 'default_gst_rate' => 18.00]);

        $res = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/invoices', [
            'client_id'     => $client->id,
            'document_type' => 'invoice',
            'tax_mode'      => 'taxable',
            'date'          => '2026-08-16',
            'items'         => [
                ['product_id' => $product->id, 'quantity' => 2, 'rate' => 100.00, 'gst_rate' => 18.00],
            ],
        ]);

        $res->assertStatus(201);
        $res->assertJson([
            'tax_mode'     => 'taxable',
            'subtotal'     => 200.00,
            'cgst_total'   => 18.00,
            'sgst_total'   => 18.00,
            'total_gst'    => 36.00,
            'total_amount' => 236.00,
        ]);
    }

    public function test_creates_non_taxable_invoice_with_zero_gst(): void
    {
        $org = Organization::factory()->create(['state' => 'Gujarat', 'gst_number' => '24AAAAA0000A1Z5']);
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id, 'state' => 'Gujarat']);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 500.00, 'default_gst_rate' => 18.00]);

        $res = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/invoices', [
            'client_id'     => $client->id,
            'document_type' => 'invoice',
            'tax_mode'      => 'non_taxable',
            'date'          => '2026-08-16',
            'items'         => [
                ['product_id' => $product->id, 'quantity' => 10, 'rate' => 500.00, 'gst_rate' => 18.00],
            ],
        ]);

        $res->assertStatus(201);
        $res->assertJson([
            'tax_mode'     => 'non_taxable',
            'subtotal'     => 5000.00,
            'cgst_total'   => 0.00,
            'sgst_total'   => 0.00,
            'igst_total'   => 0.00,
            'total_gst'    => 0.00,
            'total_amount' => 5000.00,
        ]);

        // Product default GST rate should remain unchanged in master data!
        $this->assertEquals(18.00, $product->fresh()->default_gst_rate);
    }

    public function test_non_taxable_invoice_participates_in_ledger_and_payment_allocation(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 1000.00, 'default_gst_rate' => 18.00]);

        // Create & Finalize non-taxable invoice of ₹5,000
        $draftRes = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/invoices', [
            'client_id'     => $client->id,
            'document_type' => 'invoice',
            'tax_mode'      => 'non_taxable',
            'date'          => '2026-08-16',
            'items'         => [
                ['product_id' => $product->id, 'quantity' => 5, 'rate' => 1000.00, 'gst_rate' => 18.00],
            ],
        ]);
        $invId = $draftRes->json('id');
        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$invId}/finalize");

        // Ledger check
        $reportService = app(ReportDataService::class);
        $ledgerData = $reportService->getLedgerReport($client->id, $org->id);
        $this->assertEquals(5000.00, $ledgerData['closing_balance']);

        // Payment of ₹2,000 should allocate against non-taxable invoice
        $payRes = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/payments', [
            'client_id'    => $client->id,
            'amount'       => 2000.00,
            'payment_date' => '2026-08-16',
            'payment_mode' => 'bank_transfer',
        ]);
        $payId = $payRes->json('id');

        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/payments/{$payId}/allocate-fifo");

        $updatedInv = Invoice::find($invId);
        $this->assertEquals(2000.00, $updatedInv->paid_amount);
    }

    public function test_gstr1_excludes_non_taxable_invoices_while_invoice_register_includes_them(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 100.00]);

        // Taxable invoice
        $inv1Res = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/invoices', [
            'client_id'     => $client->id,
            'document_type' => 'invoice',
            'tax_mode'      => 'taxable',
            'date'          => '2026-08-16',
            'items'         => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 100.00, 'gst_rate' => 18.00]],
        ]);
        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$inv1Res->json('id')}/finalize");

        // Non-taxable invoice
        $inv2Res = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/invoices', [
            'client_id'     => $client->id,
            'document_type' => 'invoice',
            'tax_mode'      => 'non_taxable',
            'date'          => '2026-08-16',
            'items'         => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 100.00, 'gst_rate' => 0.00]],
        ]);
        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$inv2Res->json('id')}/finalize");

        $reportService = app(ReportDataService::class);

        // GSTR-1 should include ONLY 1 invoice (taxable)
        $gstr1Data = $reportService->getGstr1Report($org->id);
        $totalGstr1Count = $gstr1Data['b2b_invoices']->count() + $gstr1Data['b2c_invoices']->count();
        $this->assertEquals(1, $totalGstr1Count);

        // Invoice Register should include BOTH 2 invoices
        $regData = $reportService->getInvoiceRegisterReport($org->id);
        $this->assertCount(2, $regData['invoices']);
    }

    public function test_finalized_non_taxable_invoice_remains_locked_as_non_taxable(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 100.00]);

        $invRes = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/invoices', [
            'client_id'     => $client->id,
            'document_type' => 'invoice',
            'tax_mode'      => 'non_taxable',
            'date'          => '2026-08-16',
            'items'         => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 100.00, 'gst_rate' => 0.00]],
        ]);
        $invId = $invRes->json('id');
        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$invId}/finalize");

        $inv = Invoice::find($invId);
        $this->assertEquals('non_taxable', $inv->tax_mode);
        $this->assertEquals('finalized', $inv->status);
        $this->assertEquals(0.00, $inv->total_gst);
    }
}
