<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use App\Services\PdfExportService;
use App\Services\TemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TemplateEngineTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolves_effective_template_hierarchy(): void
    {
        $org = Organization::factory()->create([
            'default_gst_template'     => 'gst_modern',
            'default_non_gst_template' => 'non_gst_modern',
        ]);

        $clientWithPref = Client::factory()->create([
            'organization_id'    => $org->id,
            'preferred_template' => 'gst_detailed',
        ]);

        $clientNoPref = Client::factory()->create([
            'organization_id'    => $org->id,
            'preferred_template' => null,
        ]);

        $service = app(TemplateService::class);

        // 1. Client preference wins
        $res1 = $service->resolveEffectiveTemplate($org, $clientWithPref, 'taxable');
        $this->assertEquals('gst_detailed', $res1['template_key']);
        $this->assertStringContainsString('client', $res1['reason']);

        // 2. Organization default used when client has no preference
        $res2 = $service->resolveEffectiveTemplate($org, $clientNoPref, 'taxable');
        $this->assertEquals('gst_modern', $res2['template_key']);
        $this->assertEquals('organization_default', $res2['reason']);

        // 3. Organization non-GST default used for non-taxable orders
        $res3 = $service->resolveEffectiveTemplate($org, $clientNoPref, 'non_taxable');
        $this->assertEquals('non_gst_modern', $res3['template_key']);
    }

    public function test_finalized_invoice_snapshots_and_locks_template(): void
    {
        $org = Organization::factory()->create(['default_gst_template' => 'gst_classic']);
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id, 'preferred_template' => 'gst_classic']);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 100.00]);

        $invRes = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/invoices', [
            'client_id'     => $client->id,
            'document_type' => 'invoice',
            'tax_mode'      => 'taxable',
            'template_key'  => 'gst_classic',
            'date'          => '2026-08-16',
            'items'         => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 100.00, 'gst_rate' => 18.00]],
        ]);
        $invId = $invRes->json('id');
        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$invId}/finalize");

        // Client later changes preferred template to gst_modern
        $client->update(['preferred_template' => 'gst_modern']);

        // Already finalized invoice MUST still render with snapshot template gst_classic!
        $finalizedInv = Invoice::find($invId);
        $this->assertEquals('gst_classic', $finalizedInv->template_key);

        $pdfService = app(PdfExportService::class);
        $html = $pdfService->renderInvoiceHtml($finalizedInv);
        $this->assertStringContainsString('Template: <strong>GST_CLASSIC</strong>', $html);
    }

    public function test_only_admin_can_update_organization_default_templates(): void
    {
        $org = Organization::factory()->create();

        // Operator user
        $operator = User::factory()->create();
        $operator->organizations()->attach($org->id, ['role' => 'operator']);

        $this->actingAs($operator, 'sanctum');
        $resOperator = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/organization/templates', [
            'default_gst_template'     => 'gst_modern',
            'default_non_gst_template' => 'non_gst_modern',
        ]);
        $resOperator->assertStatus(403);

        // Admin user
        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $this->actingAs($admin, 'sanctum');
        $resAdmin = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/organization/templates', [
            'default_gst_template'     => 'gst_modern',
            'default_non_gst_template' => 'non_gst_modern',
        ]);
        $resAdmin->assertStatus(200);
        $this->assertEquals('gst_modern', $org->fresh()->default_gst_template);
    }

    public function test_renders_valid_pdf_for_all_five_templates(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 250.00]);

        $inv = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'tax_mode'        => 'taxable',
            'subtotal'        => 250.00,
            'total_amount'    => 295.00,
            'status'          => 'draft',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $inv->id,
            'product_id' => $product->id,
            'quantity'   => 1,
            'rate'       => 250.00,
            'gst_rate'   => 18.00,
            'amount'     => 295.00,
        ]);

        $pdfService = app(PdfExportService::class);
        $templates = ['gst_classic', 'gst_modern', 'gst_detailed', 'non_gst_classic', 'non_gst_modern'];

        foreach ($templates as $tKey) {
            $pdfContent = $pdfService->renderInvoicePdf($inv, $tKey);
            $this->assertStringStartsWith('%PDF', $pdfContent, "Failed PDF generation for template: {$tKey}");
        }
    }
}
