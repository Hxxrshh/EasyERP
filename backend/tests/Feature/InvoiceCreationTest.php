<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceCreationTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser($org, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_creates_valid_draft_invoice_with_correct_calculations(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product1 = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 100.00,
            'default_gst_rate'=> 18.00,
        ]);
        $product2 = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 50.00,
            'default_gst_rate'=> 12.00,
        ]);

        $payload = [
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'date'            => '2026-08-15',
            'items'           => [
                [
                    'product_id' => $product1->id,
                    'quantity'   => 2,
                    'rate'       => 100.00,
                    'gst_rate'   => 18.00,
                ],
                [
                    'product_id' => $product2->id,
                    'quantity'   => 3,
                    'rate'       => 50.00,
                    'gst_rate'   => 12.00,
                ]
            ],
            'total_amount'    => 9999.99,
        ];

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'draft')
            ->assertJsonPath('organization_id', $org->id)
            ->assertJsonPath('client_id', $client->id);

        $this->assertEquals(404.00, $response->json('total_amount'));

        $this->assertDatabaseHas('invoices', [
            'id'           => $response->json('id'),
            'status'       => 'draft',
            'total_amount' => 404.00,
        ]);

        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $response->json('id'),
            'product_id' => $product1->id,
            'quantity'   => 2,
            'rate'       => 100.00,
            'gst_rate'   => 18.00,
            'amount'     => 236.00,
        ]);

        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $response->json('id'),
            'product_id' => $product2->id,
            'quantity'   => 3,
            'rate'       => 50.00,
            'gst_rate'   => 12.00,
            'amount'     => 168.00,
        ]);
    }

    public function test_validation_fails_for_invalid_client(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'       => 99999,
                'document_type'   => 'invoice',
                'date'            => '2026-08-15',
                'items'           => [
                    [
                        'product_id' => $product->id,
                        'quantity'   => 1,
                        'rate'       => 100,
                        'gst_rate'   => 18,
                    ]
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['client_id']);
    }

    public function test_validation_fails_for_invalid_product(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'       => $client->id,
                'document_type'   => 'invoice',
                'date'            => '2026-08-15',
                'items'           => [
                    [
                        'product_id' => 99999,
                        'quantity'   => 1,
                        'rate'       => 100,
                        'gst_rate'   => 18,
                    ]
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.product_id']);
    }

    public function test_validation_fails_for_empty_items(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'       => $client->id,
                'document_type'   => 'invoice',
                'date'            => '2026-08-15',
                'items'           => [],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
    }
}
