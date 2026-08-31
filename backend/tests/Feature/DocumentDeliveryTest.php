<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use App\Services\FilenameBuilderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_download_invoice_pdf_with_sanitized_filename(): void
    {
        $org = Organization::factory()->create(['name' => 'Test Org']);
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create([
            'organization_id' => $org->id,
            'name'            => 'RR Packaging / Ltd',
            'short_name'      => 'RR-Packaging',
        ]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $inv = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'tax_mode'        => 'taxable',
            'invoice_number'  => 'INV-001/26-27',
            'status'          => 'finalized',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $inv->id,
            'product_id' => $product->id,
            'quantity'   => 2,
            'rate'       => 100.00,
            'gst_rate'   => 18.00,
            'amount'     => 236.00,
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->get("/api/v1/invoices/{$inv->id}/pdf");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');

        // Check disposition header filename
        $disposition = $response->headers->get('Content-Disposition');
        $this->assertStringContainsString('Tax-Invoice-INV-001-26-27-RR-Packaging.pdf', $disposition);

        // Check valid %PDF header
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_cross_organization_invoice_pdf_download_is_rejected(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user = User::factory()->create();
        $user->organizations()->attach($org1->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client2 = Client::factory()->create(['organization_id' => $org2->id]);
        $inv2 = Invoice::factory()->create(['organization_id' => $org2->id, 'client_id' => $client2->id]);

        // Attempting to access Org 2 invoice with Org 1 context
        $response = $this->withHeader('X-Organization-Id', $org1->id)
            ->get("/api/v1/invoices/{$inv2->id}/pdf");

        $response->assertStatus(404);
    }

    public function test_prepare_delivery_payload_structure(): void
    {
        $org = Organization::factory()->create(['name' => 'Apex Traders']);
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'operator']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create([
            'organization_id'  => $org->id,
            'name'             => 'Siya Engineering',
            'short_name'       => 'siya',
            'contact_phone'    => '9876543210',
            'contact_whatsapp' => '9876543210',
        ]);

        $inv = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'tax_mode'        => 'taxable',
            'invoice_number'  => 'INV-100',
            'total_amount'    => 1500.00,
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/invoices/{$inv->id}/prepare-delivery");

        $response->assertStatus(200);
        $response->assertJson([
            'invoice_id'          => $inv->id,
            'invoice_number'      => 'INV-100',
            'filename'            => 'Tax-Invoice-INV-100-siya.pdf',
            'subject'             => 'Tax Invoice INV-100 — Siya Engineering',
            'is_email_configured' => false,
            'recipient'           => [
                'name'  => 'Siya Engineering',
                'phone' => '9876543210',
            ],
        ]);
    }

    public function test_filename_builder_sanitizes_special_characters(): void
    {
        $builder = new FilenameBuilderService();
        $raw = 'Tax/Invoice:001*26?27<RR> Packaging|.pdf';
        $sanitized = $builder->sanitizeFilename($raw);
        $this->assertEquals('Tax-Invoice-001-26-27-RR-Packaging.pdf', $sanitized);
    }

    public function test_non_taxable_bill_filename_generation(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id, 'short_name' => 'client-a']);

        $inv = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'tax_mode'        => 'non_taxable',
            'invoice_number'  => 'BILL-050',
        ]);

        $builder = new FilenameBuilderService();
        $filename = $builder->buildFilename($inv);

        $this->assertEquals('Bill-BILL-050-client-a.pdf', $filename);
    }
}
