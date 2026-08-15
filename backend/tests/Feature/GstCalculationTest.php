<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GstCalculationTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser($org, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_same_state_invoice_produces_cgst_and_sgst(): void
    {
        $org = Organization::factory()->create([
            'state'      => 'Gujarat',
            'gst_number' => '24AAACC12341ZB',
        ]);
        $this->authenticateUser($org);

        $client = Client::factory()->create([
            'organization_id' => $org->id,
            'state'           => 'Gujarat',
        ]);

        $product = Product::factory()->create([
            'organization_id'  => $org->id,
            'base_price'       => 1000.00,
            'default_gst_rate' => 18.00,
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    [
                        'product_id' => $product->id,
                        'quantity'   => 1,
                        'rate'       => 1000.00,
                        'gst_rate'   => 18.00,
                    ]
                ]
            ]);

        $response->assertStatus(201);
        $this->assertEquals(1000.00, $response->json('subtotal'));
        $this->assertEquals(90.00, $response->json('cgst_total'));
        $this->assertEquals(90.00, $response->json('sgst_total'));
        $this->assertEquals(0.00, $response->json('igst_total'));
        $this->assertEquals(180.00, $response->json('total_gst'));
        $this->assertEquals(1180.00, $response->json('total_amount'));
    }

    public function test_interstate_invoice_produces_igst(): void
    {
        $org = Organization::factory()->create([
            'state'      => 'Gujarat',
            'gst_number' => '24AAACC12341ZB',
        ]);
        $this->authenticateUser($org);

        $client = Client::factory()->create([
            'organization_id' => $org->id,
            'state'           => 'Maharashtra',
        ]);

        $product = Product::factory()->create([
            'organization_id'  => $org->id,
            'base_price'       => 1000.00,
            'default_gst_rate' => 18.00,
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    [
                        'product_id' => $product->id,
                        'quantity'   => 1,
                        'rate'       => 1000.00,
                        'gst_rate'   => 18.00,
                    ]
                ]
            ]);

        $response->assertStatus(201);
        $this->assertEquals(1000.00, $response->json('subtotal'));
        $this->assertEquals(0.00, $response->json('cgst_total'));
        $this->assertEquals(0.00, $response->json('sgst_total'));
        $this->assertEquals(180.00, $response->json('igst_total'));
        $this->assertEquals(180.00, $response->json('total_gst'));
        $this->assertEquals(1180.00, $response->json('total_amount'));
    }

    public function test_mixed_gst_rates_calculate_independently(): void
    {
        $org = Organization::factory()->create([
            'state'      => 'Gujarat',
            'gst_number' => '24AAACC12341ZB',
        ]);
        $this->authenticateUser($org);

        $client = Client::factory()->create([
            'organization_id' => $org->id,
            'state'           => 'Gujarat',
        ]);

        $prod5 = Product::factory()->create(['organization_id' => $org->id]);
        $prod18 = Product::factory()->create(['organization_id' => $org->id]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    [
                        'product_id' => $prod5->id,
                        'quantity'   => 2,
                        'rate'       => 100.00, // taxable = 200, GST 5% = 10 (5 CGST + 5 SGST)
                        'gst_rate'   => 5.00,
                    ],
                    [
                        'product_id' => $prod18->id,
                        'quantity'   => 1,
                        'rate'       => 1000.00, // taxable = 1000, GST 18% = 180 (90 CGST + 90 SGST)
                        'gst_rate'   => 18.00,
                    ]
                ]
            ]);

        $response->assertStatus(201);
        $this->assertEquals(1200.00, $response->json('subtotal'));
        $this->assertEquals(95.00, $response->json('cgst_total'));
        $this->assertEquals(95.00, $response->json('sgst_total'));
        $this->assertEquals(0.00, $response->json('igst_total'));
        $this->assertEquals(190.00, $response->json('total_gst'));
        $this->assertEquals(1390.00, $response->json('total_amount'));
    }

    public function test_organization_without_gstin_produces_zero_gst(): void
    {
        $org = Organization::factory()->create([
            'state'      => 'Gujarat',
            'gst_number' => null, // Non-GST exempt
        ]);
        $this->authenticateUser($org);

        $client = Client::factory()->create([
            'organization_id' => $org->id,
            'state'           => 'Gujarat',
        ]);

        $product = Product::factory()->create(['organization_id' => $org->id]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    [
                        'product_id' => $product->id,
                        'quantity'   => 1,
                        'rate'       => 1000.00,
                        'gst_rate'   => 18.00,
                    ]
                ]
            ]);

        $response->assertStatus(201);
        $this->assertEquals(1000.00, $response->json('subtotal'));
        $this->assertEquals(0.00, $response->json('cgst_total'));
        $this->assertEquals(0.00, $response->json('sgst_total'));
        $this->assertEquals(0.00, $response->json('igst_total'));
        $this->assertEquals(0.00, $response->json('total_gst'));
        $this->assertEquals(1000.00, $response->json('total_amount'));
    }

    public function test_backend_ignores_manipulated_frontend_totals(): void
    {
        $org = Organization::factory()->create([
            'state'      => 'Gujarat',
            'gst_number' => '24AAACC12341ZB',
        ]);
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id, 'state' => 'Gujarat']);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    [
                        'product_id' => $product->id,
                        'quantity'   => 1,
                        'rate'       => 100.00,
                        'gst_rate'   => 18.00,
                    ]
                ],
                'subtotal'      => 0.01,
                'total_gst'     => 0.00,
                'total_amount'  => 1.00,
            ]);

        $response->assertStatus(201);
        $this->assertEquals(100.00, $response->json('subtotal'));
        $this->assertEquals(18.00, $response->json('total_gst'));
        $this->assertEquals(118.00, $response->json('total_amount'));
    }
}
