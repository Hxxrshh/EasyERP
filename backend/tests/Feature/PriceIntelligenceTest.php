<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use App\Services\PriceIntelligenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PriceIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolves_price_using_client_specific_latest_finalized_tax_invoice(): void
    {
        $org = Organization::factory()->create();
        $client1 = Client::factory()->create(['organization_id' => $org->id]);
        $client2 = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 100.00,
        ]);

        // Client 1 bought at 128.00 on 2026-08-01
        $invClient1 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client1->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-01',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $invClient1->id,
            'product_id' => $product->id,
            'rate'       => 128.00,
        ]);

        // Client 2 bought at 135.00 on 2026-08-05
        $invClient2 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client2->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-05',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $invClient2->id,
            'product_id' => $product->id,
            'rate'       => 135.00,
        ]);

        $service = new PriceIntelligenceService();

        // Client 1 should get 128.00
        $details1 = $service->resolveUnitPriceDetails($org->id, $client1->id, $product->id);
        $this->assertEquals(128.00, $details1['resolved_rate']);
        $this->assertEquals('client_last_sale', $details1['source']);
        $this->assertStringContainsString('Last sold to this client', $details1['source_label']);

        // Client 2 should get 135.00
        $details2 = $service->resolveUnitPriceDetails($org->id, $client2->id, $product->id);
        $this->assertEquals(135.00, $details2['resolved_rate']);
        $this->assertEquals('client_last_sale', $details2['source']);
    }

    public function test_resolves_price_using_latest_organization_sale_when_client_has_no_history(): void
    {
        $org = Organization::factory()->create();
        $clientWithHistory = Client::factory()->create(['organization_id' => $org->id]);
        $clientNew = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 100.00,
        ]);

        $inv = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $clientWithHistory->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-10',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $inv->id,
            'product_id' => $product->id,
            'rate'       => 125.00,
        ]);

        $service = new PriceIntelligenceService();
        $details = $service->resolveUnitPriceDetails($org->id, $clientNew->id, $product->id);

        $this->assertEquals(125.00, $details['resolved_rate']);
        $this->assertEquals('org_last_sale', $details['source']);
        $this->assertStringContainsString('Latest organization sale', $details['source_label']);
    }

    public function test_falls_back_to_product_base_price_when_no_finalized_history_exists(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 150.00,
        ]);

        $service = new PriceIntelligenceService();
        $details = $service->resolveUnitPriceDetails($org->id, $client->id, $product->id);

        $this->assertEquals(150.00, $details['resolved_rate']);
        $this->assertEquals('base_price', $details['source']);
        $this->assertStringContainsString('Base price', $details['source_label']);
    }

    public function test_non_finalized_documents_and_cancelled_invoices_are_ignored(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 100.00,
        ]);

        // Quote
        $quote = Invoice::factory()->create(['organization_id' => $org->id, 'client_id' => $client->id, 'document_type' => 'quote', 'status' => 'finalized', 'date' => '2026-08-10']);
        InvoiceItem::factory()->create(['invoice_id' => $quote->id, 'product_id' => $product->id, 'rate' => 50.00]);

        // Proforma
        $proforma = Invoice::factory()->create(['organization_id' => $org->id, 'client_id' => $client->id, 'document_type' => 'proforma', 'status' => 'finalized', 'date' => '2026-08-11']);
        InvoiceItem::factory()->create(['invoice_id' => $proforma->id, 'product_id' => $product->id, 'rate' => 60.00]);

        // Draft Tax Invoice
        $draft = Invoice::factory()->create(['organization_id' => $org->id, 'client_id' => $client->id, 'document_type' => 'invoice', 'status' => 'draft', 'date' => '2026-08-12']);
        InvoiceItem::factory()->create(['invoice_id' => $draft->id, 'product_id' => $product->id, 'rate' => 70.00]);

        // Cancelled Tax Invoice
        $cancelled = Invoice::factory()->create(['organization_id' => $org->id, 'client_id' => $client->id, 'document_type' => 'invoice', 'status' => 'cancelled', 'date' => '2026-08-13']);
        InvoiceItem::factory()->create(['invoice_id' => $cancelled->id, 'product_id' => $product->id, 'rate' => 80.00]);

        $service = new PriceIntelligenceService();
        $details = $service->resolveUnitPriceDetails($org->id, $client->id, $product->id);

        // Must ignore non-finalized/non-tax-invoice items and fall back to base_price 100.00
        $this->assertEquals(100.00, $details['resolved_rate']);
        $this->assertEquals('base_price', $details['source']);
    }

    public function test_different_organizations_cannot_affect_each_others_prices(): void
    {
        $org1 = Organization::factory()->create();
        $client1 = Client::factory()->create(['organization_id' => $org1->id]);
        $product1 = Product::factory()->create(['organization_id' => $org1->id, 'base_price' => 100.00]);

        $org2 = Organization::factory()->create();
        $client2 = Client::factory()->create(['organization_id' => $org2->id]);
        $product2 = Product::factory()->create(['organization_id' => $org2->id, 'base_price' => 200.00]);

        // Org 1 finalizes sale at 80.00
        $inv1 = Invoice::factory()->create([
            'organization_id' => $org1->id,
            'client_id'       => $client1->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => '2026-08-15',
        ]);
        InvoiceItem::factory()->create(['invoice_id' => $inv1->id, 'product_id' => $product1->id, 'rate' => 80.00]);

        $service = new PriceIntelligenceService();
        $details = $service->resolveUnitPriceDetails($org2->id, $client2->id, $product2->id);

        $this->assertEquals(200.00, $details['resolved_rate']);
        $this->assertEquals('base_price', $details['source']);
    }

    public function test_price_resolve_api_endpoint_returns_detailed_source_response(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 120.00]);

        $res = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/price-resolve?client_id={$client->id}&product_id={$product->id}");

        $res->assertStatus(200);
        $res->assertJson([
            'resolved_rate' => 120.00,
            'source'        => 'base_price',
            'source_label'  => 'Base price · ₹120',
        ]);
    }
}
