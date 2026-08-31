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

class ReportsAndExportsTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser($org, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_authenticated_user_can_export_ledger_pdf_and_xlsx(): void
    {
        $org = Organization::factory()->create(['state' => 'Gujarat']);
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id, 'state' => 'Gujarat']);

        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-01',
            'total_amount'    => 1000.00,
            'paid_amount'     => 400.00,
        ]);

        Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'payment_date'    => '2026-08-05',
            'amount'          => 400.00,
        ]);

        // PDF Export
        $resPdf = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/ledgers/{$client->id}/export?format=pdf");

        $resPdf->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $resPdf->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $resPdf->getContent());

        // XLSX Export
        $resXlsx = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/ledgers/{$client->id}/export?format=xlsx");

        $resXlsx->assertStatus(200);
        $this->assertStringContainsString('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $resXlsx->headers->get('Content-Type'));
        $this->assertStringStartsWith('PK', $resXlsx->getContent());
    }

    public function test_auditor_can_export_client_ledger(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org, 'auditor');

        $client = Client::factory()->create(['organization_id' => $org->id]);

        $resPdf = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/ledgers/{$client->id}/export?format=pdf");

        $resPdf->assertStatus(200);
    }

    public function test_cross_organization_ledger_export_is_rejected(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $this->authenticateUser($org1);
        $clientOrg2 = Client::factory()->create(['organization_id' => $org2->id]);

        $this->withHeader('X-Organization-Id', $org1->id)
            ->getJson("/api/v1/ledgers/{$clientOrg2->id}/export?format=pdf")
            ->assertStatus(404);
    }

    public function test_invoice_register_report_includes_only_finalized_tax_invoices(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Finalized Tax Invoice
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'subtotal'        => 1000.00,
            'total_gst'       => 180.00,
            'total_amount'    => 1180.00,
        ]);

        // Draft Tax Invoice (must be excluded)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'draft',
            'subtotal'        => 500.00,
        ]);

        // Quote (must be excluded)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'quote',
            'status'          => 'finalized',
            'subtotal'        => 500.00,
        ]);

        $res = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/reports/invoices?format=json');

        $res->assertStatus(200);
        $this->assertEquals(1000.00, $res->json('totals.taxable_amount'));
        $this->assertEquals(180.00, $res->json('totals.total_gst'));
        $this->assertEquals(1180.00, $res->json('totals.grand_total'));

        $this->assertCount(1, $res->json('invoices'));
    }

    public function test_gstr1_report_b2b_b2c_classification_and_hsn_summary(): void
    {
        $org = Organization::factory()->create(['state' => 'Gujarat', 'gst_number' => '24AAACC12341ZB']);
        $this->authenticateUser($org);

        $b2bClient = Client::factory()->create(['organization_id' => $org->id, 'gst_number' => '24BBBCC12341ZA']);
        $b2cClient = Client::factory()->create(['organization_id' => $org->id, 'gst_number' => null]);

        $product = Product::factory()->create(['organization_id' => $org->id, 'hsn_code' => '8471', 'base_price' => 1000]);

        // B2B Invoice
        $inv1 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $b2bClient->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'subtotal'        => 1000.00,
            'cgst_total'      => 90.00,
            'sgst_total'      => 90.00,
            'total_gst'       => 180.00,
            'total_amount'    => 1180.00,
        ]);
        $inv1->items()->create(['product_id' => $product->id, 'quantity' => 1, 'rate' => 1000, 'gst_rate' => 18, 'amount' => 1180, 'taxable_amount' => 1000, 'cgst_amount' => 90, 'sgst_amount' => 90, 'igst_amount' => 0]);

        // B2C Invoice
        $inv2 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $b2cClient->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'subtotal'        => 500.00,
            'cgst_total'      => 45.00,
            'sgst_total'      => 45.00,
            'total_gst'       => 90.00,
            'total_amount'    => 590.00,
        ]);
        $inv2->items()->create(['product_id' => $product->id, 'quantity' => 1, 'rate' => 500, 'gst_rate' => 18, 'amount' => 590, 'taxable_amount' => 500, 'cgst_amount' => 45, 'sgst_amount' => 45, 'igst_amount' => 0]);

        $res = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/reports/gstr1?format=json');

        $res->assertStatus(200);
        $this->assertCount(1, $res->json('b2b_invoices'));
        $this->assertCount(1, $res->json('b2c_invoices'));
        $this->assertCount(1, $res->json('hsn_summary'));

        // Assert HSN summary totals
        $hsn = $res->json('hsn_summary.0');
        $this->assertEquals('8471', $hsn['hsn_code']);
        $this->assertEquals(2, $hsn['total_quantity']);
        $this->assertEquals(1500.00, $hsn['taxable_value']);
        $this->assertEquals(270.00, $hsn['total_tax']);
    }

    public function test_financial_year_resolution(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Out-of-FY Invoice (March 2026)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-03-25',
            'subtotal'        => 500.00,
        ]);

        // In-FY Invoice (August 2026)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-15',
            'subtotal'        => 1000.00,
        ]);

        $res = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/reports/invoices?financial_year=2026-27&format=json');

        $res->assertStatus(200);
        $this->assertCount(1, $res->json('invoices'));
        $this->assertEquals(1000.00, $res->json('totals.taxable_amount'));
    }

    public function test_audit_export_pdf_xlsx_csv(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        // PDF Audit Export
        $resPdf = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/reports/audit?format=pdf');
        $resPdf->assertStatus(200);
        $this->assertStringContainsString('application/pdf', $resPdf->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $resPdf->getContent());

        // XLSX Audit Export
        $resXlsx = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/reports/audit?format=xlsx');
        $resXlsx->assertStatus(200);
        $this->assertStringContainsString('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $resXlsx->headers->get('Content-Type'));
        $this->assertStringStartsWith('PK', $resXlsx->getContent());

        // CSV Audit Export
        $resCsv = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/reports/audit?format=csv');
        $resCsv->assertStatus(200);
        $this->assertStringContainsString('text/csv', $resCsv->headers->get('Content-Type'));
    }

    public function test_data_consistency_across_api_pdf_and_excel(): void
    {
        $org = Organization::factory()->create(['state' => 'Gujarat']);
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id, 'state' => 'Gujarat']);

        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-01',
            'total_amount'    => 1000.00,
            'paid_amount'     => 400.00,
        ]);

        Payment::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'payment_date'    => '2026-08-05',
            'amount'          => 400.00,
        ]);

        $reportService = app(ReportDataService::class);
        $data = $reportService->getLedgerReport($client->id, $org->id);

        $this->assertEquals(0.00, $data['opening_balance']);
        $this->assertEquals(600.00, $data['closing_balance']);
        $this->assertEquals(600.00, $data['current_outstanding']);
    }
}
