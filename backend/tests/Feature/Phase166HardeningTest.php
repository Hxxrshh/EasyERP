<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use App\Services\PdfExportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase166HardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_distinct_template_visual_layout_rendering(): void
    {
        $org = Organization::factory()->create(['name' => 'Apex Industrial Corp']);
        $client = Client::factory()->create(['organization_id' => $org->id, 'name' => 'RR Packaging']);
        $product = Product::factory()->create(['organization_id' => $org->id, 'name' => 'HDPE Granules']);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'draft',
            'tax_mode'        => 'taxable',
            'document_type'   => 'invoice',
        ]);

        $pdfService = app(PdfExportService::class);

        // 1. Template A - Classic Traditional Ledger
        $htmlClassic = $pdfService->renderInvoiceHtml($invoice, 'gst_classic');
        $this->assertStringContainsString('outer-border', $htmlClassic);

        // 2. Template B - Modern Business Card Layout
        $htmlModern = $pdfService->renderInvoiceHtml($invoice, 'gst_modern');
        $this->assertStringContainsString('top-bar', $htmlModern);

        // 3. Template C - Industrial Dispatch Layout
        $htmlInd = $pdfService->renderInvoiceHtml($invoice, 'gst_industrial');
        $this->assertStringContainsString('GIDC DISPATCH NOTICE', $htmlInd);

        // 4. Template D - Corporate Executive Layout
        $htmlCorp = $pdfService->renderInvoiceHtml($invoice, 'gst_corporate');
        $this->assertStringContainsString('REMITTANCE BANK DETAILS', $htmlCorp);

        // 5. Template E - Non-GST Commercial Bill
        $htmlNonGst = $pdfService->renderInvoiceHtml($invoice, 'non_gst_classic');
        $this->assertStringContainsString('Non-Taxable Order', $htmlNonGst);

        // 6. Template H - Delivery Challan
        $invoice->document_type = 'challan';
        $htmlChallan = $pdfService->renderInvoiceHtml($invoice, 'challan_industrial');
        $this->assertStringContainsString('DELIVERY / DISPATCH CHALLAN', $htmlChallan);
    }

    public function test_organization_settings_and_creation_endpoints(): void
    {
        $org = Organization::factory()->create(['name' => 'Org Alpha']);
        $adminUser = User::factory()->create();
        $adminUser->organizations()->attach($org->id, ['role' => 'admin']);

        $operatorUser = User::factory()->create();
        $operatorUser->organizations()->attach($org->id, ['role' => 'operator']);

        // 1. Show Organization Settings
        $this->actingAs($adminUser, 'sanctum');
        $showRes = $this->withHeader('X-Organization-Id', $org->id)->getJson('/api/v1/organization/settings');
        $showRes->assertStatus(200);
        $showRes->assertJsonPath('organization.id', $org->id);

        // 2. Operator Role gets 403 Forbidden on Settings Update
        $this->actingAs($operatorUser, 'sanctum');
        $updateForbidden = $this->withHeader('X-Organization-Id', $org->id)->putJson('/api/v1/organization/settings', [
            'name'  => 'Attempted Name Change',
            'state' => 'Gujarat',
        ]);
        $updateForbidden->assertStatus(403);

        // 3. Admin Role Updates Organization Settings
        $this->actingAs($adminUser, 'sanctum');
        $updateRes = $this->withHeader('X-Organization-Id', $org->id)->putJson('/api/v1/organization/settings', [
            'name'       => 'Org Alpha Updated',
            'state'      => 'Gujarat',
            'gst_number' => '24AAACA1234F1Z5',
            'upi_id'     => 'orgalpha@sbi',
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals('Org Alpha Updated', $org->fresh()->name);

        // 4. Admin Creates New Organization
        $createRes = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/organizations', [
            'name'  => 'Org Beta Manufacturing',
            'state' => 'Maharashtra',
        ]);
        $createRes->assertStatus(201);
        $newOrgId = $createRes->json('organization.id');
        $this->assertDatabaseHas('organizations', ['id' => $newOrgId, 'name' => 'Org Beta Manufacturing']);
    }
}
