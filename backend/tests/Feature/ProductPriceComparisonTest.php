<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductPriceComparisonTest extends TestCase
{
    use RefreshDatabase;

    public function test_price_comparison_across_multiple_clients(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 100]);

        $clientA = Client::factory()->create(['organization_id' => $org->id, 'name' => 'RR Packaging']);
        $clientB = Client::factory()->create(['organization_id' => $org->id, 'name' => 'Siya Engineering']);
        $clientC = Client::factory()->create(['organization_id' => $org->id, 'name' => 'ABC Industries']);

        // Finalized Invoice for Client A @ 112
        $invA = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $clientA->id,
            'status'          => 'finalized',
            'document_type'   => 'invoice',
            'date'            => '2026-08-11',
        ]);
        InvoiceItem::factory()->create(['invoice_id' => $invA->id, 'product_id' => $product->id, 'quantity' => 125, 'rate' => 112, 'gst_rate' => 18]);

        // Finalized Invoice for Client B @ 108
        $invB = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $clientB->id,
            'status'          => 'finalized',
            'document_type'   => 'invoice',
            'date'            => '2026-08-09',
        ]);
        InvoiceItem::factory()->create(['invoice_id' => $invB->id, 'product_id' => $product->id, 'quantity' => 200, 'rate' => 108, 'gst_rate' => 18]);

        // Finalized Invoice for Client C @ 115
        $invC = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $clientC->id,
            'status'          => 'finalized',
            'document_type'   => 'invoice',
            'date'            => '2026-08-05',
        ]);
        InvoiceItem::factory()->create(['invoice_id' => $invC->id, 'product_id' => $product->id, 'quantity' => 80, 'rate' => 115, 'gst_rate' => 18]);

        // Call API
        $res = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/products/{$product->id}/price-comparison?client_ids={$clientA->id},{$clientB->id},{$clientC->id}");

        $res->assertStatus(200);
        $data = $res->json();

        $this->assertEquals(108, $data['metrics']['lowest']['rate']);
        $this->assertEquals('Siya Engineering', $data['metrics']['lowest']['client_name']);
        $this->assertEquals(115, $data['metrics']['highest']['rate']);
        $this->assertEquals('ABC Industries', $data['metrics']['highest']['client_name']);
        $this->assertEquals(111.67, $data['metrics']['average']);
        $this->assertEquals(7, $data['metrics']['spread']);
        $this->assertCount(3, $data['comparisons']);
    }

    public function test_excludes_draft_and_cancelled_invoices(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 100]);
        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Draft invoice @ 90
        $draft = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'draft',
            'document_type'   => 'invoice',
            'date'            => '2026-08-15',
        ]);
        InvoiceItem::factory()->create(['invoice_id' => $draft->id, 'product_id' => $product->id, 'quantity' => 10, 'rate' => 90, 'gst_rate' => 18]);

        // Cancelled invoice @ 80
        $cancelled = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'cancelled',
            'document_type'   => 'invoice',
            'date'            => '2026-08-14',
        ]);
        InvoiceItem::factory()->create(['invoice_id' => $cancelled->id, 'product_id' => $product->id, 'quantity' => 10, 'rate' => 80, 'gst_rate' => 18]);

        // Finalized invoice @ 120
        $finalized = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'document_type'   => 'invoice',
            'date'            => '2026-08-10',
        ]);
        InvoiceItem::factory()->create(['invoice_id' => $finalized->id, 'product_id' => $product->id, 'quantity' => 10, 'rate' => 120, 'gst_rate' => 18]);

        $res = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/products/{$product->id}/price-comparison?client_ids={$client->id}");

        $res->assertStatus(200);
        $data = $res->json();

        // Draft and cancelled should be excluded, only 120 should be present
        $this->assertEquals(120, $data['metrics']['lowest']['rate']);
        $this->assertEquals(120, $data['metrics']['highest']['rate']);
    }

    public function test_organization_isolation_in_price_comparison(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $admin1 = User::factory()->create();
        $admin1->organizations()->attach($org1->id, ['role' => 'admin']);

        $product1 = Product::factory()->create(['organization_id' => $org1->id]);
        $product2 = Product::factory()->create(['organization_id' => $org2->id]);

        $client1 = Client::factory()->create(['organization_id' => $org1->id]);

        // Attempting to query product from org2 using org1 header
        $res = $this->actingAs($admin1, 'sanctum')
            ->withHeader('X-Organization-Id', $org1->id)
            ->getJson("/api/v1/products/{$product2->id}/price-comparison");

        $res->assertStatus(404);
    }
}
