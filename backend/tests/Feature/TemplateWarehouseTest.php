<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientDocumentTemplate;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use App\Services\PdfExportService;
use App\Services\TemplateWarehouseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TemplateWarehouseTest extends TestCase
{
    use RefreshDatabase;

    public function test_template_warehouse_catalog_metadata(): void
    {
        $service = new TemplateWarehouseService();
        $catalog = $service->getWarehouseCatalog();

        $this->assertGreaterThanOrEqual(10, count($catalog));
        $keys = array_column($catalog, 'key');
        $this->assertContains('gst_classic', $keys);
        $this->assertContains('gst_corporate', $keys);
        $this->assertContains('non_gst_classic', $keys);
        $this->assertContains('quote_modern', $keys);
        $this->assertContains('proforma_corporate', $keys);
        $this->assertContains('challan_warehouse', $keys);
    }

    public function test_client_specific_multi_template_resolution_hierarchy(): void
    {
        $org = Organization::factory()->create([
            'default_gst_template'     => 'gst_classic',
            'default_non_gst_template' => 'non_gst_classic',
        ]);

        $client = Client::factory()->create([
            'organization_id' => $org->id,
            'name'            => 'RR Packaging',
        ]);

        // Configure client distinct preferences per document type & tax mode
        ClientDocumentTemplate::create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'tax_mode'        => 'taxable',
            'template_key'    => 'gst_corporate',
            'template_version' => 'v1',
        ]);

        ClientDocumentTemplate::create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'tax_mode'        => 'non_taxable',
            'template_key'    => 'non_gst_modern',
            'template_version' => 'v1',
        ]);

        ClientDocumentTemplate::create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'quote',
            'tax_mode'        => 'taxable',
            'template_key'    => 'quote_professional',
            'template_version' => 'v1',
        ]);

        $service = new TemplateWarehouseService();

        // 1. Taxable Tax Invoice -> gst_corporate
        $res1 = $service->resolveTemplate($org, $client, 'invoice', 'taxable');
        $this->assertEquals('gst_corporate', $res1['template_key']);

        // 2. Non-Taxable Bill -> non_gst_modern
        $res2 = $service->resolveTemplate($org, $client, 'invoice', 'non_taxable');
        $this->assertEquals('non_gst_modern', $res2['template_key']);

        // 3. Taxable Quote -> quote_professional
        $res3 = $service->resolveTemplate($org, $client, 'quote', 'taxable');
        $this->assertEquals('quote_professional', $res3['template_key']);
    }

    public function test_template_tax_mode_compatibility_enforcement(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Attempting to set incompatible template (Taxable + non_gst_classic)
        $resIncompatible = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/clients/{$client->id}/templates", [
                'document_type' => 'invoice',
                'tax_mode'      => 'taxable',
                'template_key'  => 'non_gst_classic',
            ]);
        $resIncompatible->assertStatus(422);

        // Valid compatible template (Taxable + gst_corporate)
        $resCompatible = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/clients/{$client->id}/templates", [
                'document_type' => 'invoice',
                'tax_mode'      => 'taxable',
                'template_key'  => 'gst_corporate',
            ]);
        $resCompatible->assertStatus(200);
    }

    public function test_finalized_snapshot_retains_template_key_and_version(): void
    {
        $org = Organization::factory()->create(['default_gst_template' => 'gst_classic']);
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $invRes = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/invoices', [
            'client_id'     => $client->id,
            'document_type' => 'invoice',
            'tax_mode'      => 'taxable',
            'template_key'  => 'gst_corporate',
            'date'          => '2026-08-16',
            'items'         => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 500.00, 'gst_rate' => 18.00]],
        ]);
        $invId = $invRes->json('id');
        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$invId}/finalize");

        // Client later changes preference
        ClientDocumentTemplate::create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'tax_mode'        => 'taxable',
            'template_key'    => 'gst_minimal',
            'template_version' => 'v1',
        ]);

        $finalizedInv = Invoice::find($invId);
        $this->assertEquals('gst_corporate', $finalizedInv->template_key);
        $this->assertEquals('v1', $finalizedInv->template_version);
    }

    public function test_demo_preview_html_and_pdf_generation_for_warehouse_templates(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'operator']);
        $this->actingAs($user, 'sanctum');

        $resDemo = $this->withHeader('X-Organization-Id', $org->id)
            ->get('/api/v1/templates/preview-demo?template_key=gst_corporate');
        $resDemo->assertStatus(200);
        $resDemo->assertHeader('Content-Type', 'text/html; charset=UTF-8');
        $this->assertStringContainsString($org->name, $resDemo->getContent());

        $pdfService = app(PdfExportService::class);
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $inv = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'tax_mode'        => 'taxable',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $inv->id,
            'product_id' => $product->id,
            'quantity'   => 1,
            'rate'       => 100.00,
            'gst_rate'   => 18.00,
            'amount'     => 118.00,
        ]);

        $pdfBinary = $pdfService->renderInvoicePdf($inv, 'gst_corporate');
        $this->assertStringStartsWith('%PDF', $pdfBinary);
    }
}
