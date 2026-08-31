<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportReliabilityAndTemplatePreviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_pdf_and_template_demo_preview_stream_correctly(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'tax_mode'        => 'taxable',
            'template_key'    => 'gst_classic',
        ]);

        // 1. Invoice PDF Export
        $resPdf = $this->withHeader('X-Organization-Id', $org->id)
            ->get("/api/v1/invoices/{$invoice->id}/pdf");

        $resPdf->assertStatus(200);
        $resPdf->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $resPdf->getContent());

        // 2. Demo Template Preview HTML
        $resDemo = $this->withHeader('X-Organization-Id', $org->id)
            ->get('/api/v1/templates/preview-demo?template_key=gst_modern');

        $resDemo->assertStatus(200);
        $resDemo->assertHeader('Content-Type', 'text/html; charset=UTF-8');
        $this->assertStringContainsString('<!DOCTYPE html>', $resDemo->getContent());
        $this->assertStringContainsString('GST_MODERN', $resDemo->getContent());
    }

    public function test_xlsx_exports_stream_valid_zip_pk_headers(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // 1. Invoice Register XLSX
        $resInvReg = $this->withHeader('X-Organization-Id', $org->id)
            ->get('/api/v1/reports/invoices?format=xlsx');

        $resInvReg->assertStatus(200);
        $resInvReg->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertStringStartsWith('PK', $resInvReg->getContent());

        // 2. GSTR-1 XLSX
        $resGstr1 = $this->withHeader('X-Organization-Id', $org->id)
            ->get('/api/v1/reports/gstr1?format=xlsx');

        $resGstr1->assertStatus(200);
        $resGstr1->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertStringStartsWith('PK', $resGstr1->getContent());

        // 3. Ledger XLSX
        $resLedger = $this->withHeader('X-Organization-Id', $org->id)
            ->get("/api/v1/ledgers/{$client->id}/export?format=xlsx");

        $resLedger->assertStatus(200);
        $resLedger->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertStringStartsWith('PK', $resLedger->getContent());

        // 4. Audit Log XLSX
        $resAudit = $this->withHeader('X-Organization-Id', $org->id)
            ->get('/api/v1/reports/audit?format=xlsx');

        $resAudit->assertStatus(200);
        $resAudit->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertStringStartsWith('PK', $resAudit->getContent());
    }
}
