<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientProductPrice;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Services\PriceIntelligenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PriceIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolves_price_using_client_specific_historical_price(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 100.00,
        ]);

        // Client specific price override
        ClientProductPrice::create([
            'client_id'  => $client->id,
            'product_id' => $product->id,
            'last_price' => 75.50,
        ]);

        $service = new PriceIntelligenceService();
        $rate = $service->resolveUnitPrice($org->id, $client->id, $product->id);

        $this->assertEquals(75.50, $rate);
    }

    public function test_resolves_price_using_latest_finalized_global_sale_rate(): void
    {
        $org = Organization::factory()->create();
        $client1 = Client::factory()->create(['organization_id' => $org->id]);
        $client2 = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 100.00,
        ]);

        // Older finalized invoice for client1
        $oldInv = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client1->id,
            'status'          => 'finalized',
            'date'            => '2026-08-01',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $oldInv->id,
            'product_id' => $product->id,
            'rate'       => 85.00,
        ]);

        // Newer finalized invoice for client1
        $newInv = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client1->id,
            'status'          => 'finalized',
            'date'            => '2026-08-10',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $newInv->id,
            'product_id' => $product->id,
            'rate'       => 90.00,
        ]);

        // Resolving price for client2 (who has no client_product_prices record)
        $service = new PriceIntelligenceService();
        $rate = $service->resolveUnitPrice($org->id, $client2->id, $product->id);

        $this->assertEquals(90.00, $rate);
    }

    public function test_falls_back_to_product_base_price(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 150.00,
        ]);

        $service = new PriceIntelligenceService();
        $rate = $service->resolveUnitPrice($org->id, $client->id, $product->id);

        $this->assertEquals(150.00, $rate);
    }

    public function test_draft_invoices_are_ignored_by_global_price_history(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 100.00,
        ]);

        // Draft invoice with lower rate
        $draftInv = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'draft',
            'date'            => '2026-08-15',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $draftInv->id,
            'product_id' => $product->id,
            'rate'       => 50.00,
        ]);

        $service = new PriceIntelligenceService();
        $rate = $service->resolveUnitPrice($org->id, $client->id, $product->id);

        // Should ignore draft item rate (50.00) and fall back to base_price (100.00)
        $this->assertEquals(100.00, $rate);
    }

    public function test_different_organizations_cannot_affect_each_others_prices(): void
    {
        $org1 = Organization::factory()->create();
        $client1 = Client::factory()->create(['organization_id' => $org1->id]);
        $product1 = Product::factory()->create([
            'organization_id' => $org1->id,
            'base_price'      => 100.00,
        ]);

        $org2 = Organization::factory()->create();
        $client2 = Client::factory()->create(['organization_id' => $org2->id]);
        $product2 = Product::factory()->create([
            'organization_id' => $org2->id,
            'base_price'      => 200.00,
        ]);

        // Org 1 finalizes sale at 80.00
        $inv1 = Invoice::factory()->create([
            'organization_id' => $org1->id,
            'client_id'       => $client1->id,
            'status'          => 'finalized',
            'date'            => '2026-08-15',
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $inv1->id,
            'product_id' => $product1->id,
            'rate'       => 80.00,
        ]);

        $service = new PriceIntelligenceService();
        $rateOrg2 = $service->resolveUnitPrice($org2->id, $client2->id, $product2->id);

        // Org 2 price resolution should fall back to its own product base_price (200.00)
        $this->assertEquals(200.00, $rateOrg2);
    }
}
