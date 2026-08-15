<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_access_another_organizations_data_via_header_tampering(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user = User::factory()->create();
        $user->organizations()->attach($org1->id, ['role' => 'admin']);

        // User attempts to specify Org 2 header
        $response = $this->actingAs($user, 'sanctum')
            ->withHeader('X-Organization-Id', $org2->id)
            ->getJson('/api/v1/meta');

        $response->assertStatus(403);
    }

    public function test_user_cannot_access_another_organizations_client_in_invoice_creation(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user1 = User::factory()->create();
        $user1->organizations()->attach($org1->id, ['role' => 'operator']);

        $clientOrg2 = Client::factory()->create(['organization_id' => $org2->id]);
        $productOrg1 = Product::factory()->create(['organization_id' => $org1->id]);

        $response = $this->actingAs($user1, 'sanctum')
            ->withHeader('X-Organization-Id', $org1->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $clientOrg2->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    [
                        'product_id' => $productOrg1->id,
                        'quantity'   => 1,
                        'rate'       => 100,
                        'gst_rate'   => 18,
                    ]
                ]
            ]);

        $response->assertStatus(403);
    }

    public function test_user_cannot_access_another_organizations_product_in_invoice_creation(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user1 = User::factory()->create();
        $user1->organizations()->attach($org1->id, ['role' => 'operator']);

        $clientOrg1 = Client::factory()->create(['organization_id' => $org1->id]);
        $productOrg2 = Product::factory()->create(['organization_id' => $org2->id]);

        $response = $this->actingAs($user1, 'sanctum')
            ->withHeader('X-Organization-Id', $org1->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $clientOrg1->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    [
                        'product_id' => $productOrg2->id,
                        'quantity'   => 1,
                        'rate'       => 100,
                        'gst_rate'   => 18,
                    ]
                ]
            ]);

        $response->assertStatus(403);
    }

    public function test_user_cannot_access_another_organizations_invoice(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user1 = User::factory()->create();
        $user1->organizations()->attach($org1->id, ['role' => 'operator']);

        $invOrg2 = Invoice::factory()->create(['organization_id' => $org2->id]);

        $response = $this->actingAs($user1, 'sanctum')
            ->withHeader('X-Organization-Id', $org1->id)
            ->getJson("/api/v1/invoices/{$invOrg2->id}");

        $response->assertStatus(404);
    }

    public function test_user_cannot_access_another_organizations_ledger(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user1 = User::factory()->create();
        $user1->organizations()->attach($org1->id, ['role' => 'operator']);

        $clientOrg2 = Client::factory()->create(['organization_id' => $org2->id]);

        $response = $this->actingAs($user1, 'sanctum')
            ->withHeader('X-Organization-Id', $org1->id)
            ->getJson("/api/v1/ledgers/{$clientOrg2->id}");

        $response->assertStatus(404);
    }

    public function test_user_cannot_resolve_another_organizations_price(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user1 = User::factory()->create();
        $user1->organizations()->attach($org1->id, ['role' => 'operator']);

        $clientOrg2 = Client::factory()->create(['organization_id' => $org2->id]);
        $productOrg2 = Product::factory()->create(['organization_id' => $org2->id]);

        $response = $this->actingAs($user1, 'sanctum')
            ->withHeader('X-Organization-Id', $org1->id)
            ->getJson("/api/v1/price-resolve?client_id={$clientOrg2->id}&product_id={$productOrg2->id}");

        $response->assertStatus(403);
    }
}
