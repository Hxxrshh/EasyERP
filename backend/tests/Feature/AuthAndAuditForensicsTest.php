<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthAndAuditForensicsTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_fails_with_invalid_password(): void
    {
        User::factory()->create([
            'email'    => 'admin@lr-billing.com',
            'password' => Hash::make('correct_password'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@lr-billing.com',
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Invalid credentials.');
    }

    public function test_login_fails_with_nonexistent_user(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'nonexistent@lr-billing.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Invalid credentials.');
    }

    public function test_login_validation_errors_for_empty_fields(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => '',
            'password' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_authenticated_me_endpoint_returns_user_with_organizations(): void
    {
        $org = Organization::factory()->create(['name' => 'Test Org']);
        $user = User::factory()->create(['email' => 'me@example.com']);
        $user->organizations()->attach($org->id, ['role' => 'admin']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('email', 'me@example.com')
            ->assertJsonCount(1, 'organizations')
            ->assertJsonPath('organizations.0.name', 'Test Org');
    }

    public function test_global_search_works_with_query(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);

        Client::factory()->create([
            'organization_id' => $org->id,
            'name'            => 'Acme Special Customer',
            'gst_number'      => '24AAAC0000A1Z5',
        ]);

        Product::factory()->create([
            'organization_id' => $org->id,
            'name'            => 'Acme Special Polyethylene',
            'hsn_code'        => '3901',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/search?query=Acme');

        $response->assertStatus(200)
            ->assertJsonStructure(['clients', 'invoices', 'products', 'payments'])
            ->assertJsonCount(1, 'clients')
            ->assertJsonCount(1, 'products');
    }

    public function test_auto_allocate_payment_endpoint(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'document_type'   => 'invoice',
            'total_amount'    => 1000.00,
            'paid_amount'     => 0.00,
            'date'            => '2026-04-01',
        ]);

        $payment = Payment::create([
            'organization_id'       => $org->id,
            'client_id'             => $client->id,
            'amount'                => 1000.00,
            'unallocated_amount'    => 1000.00,
            'payment_date'          => '2026-04-02',
            'payment_mode'          => 'bank_transfer',
            'transaction_reference' => 'TXN-AUTO-1',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/payments/{$payment->id}/auto-allocate");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Payment auto-allocated successfully.');

        $this->assertEquals(1000.00, (float) $invoice->fresh()->paid_amount);
        $this->assertEquals(0.00, (float) $payment->fresh()->unallocated_amount);
    }

    public function test_accura_admin_login_success(): void
    {
        User::factory()->create([
            'email'    => 'admin@accura.io',
            'password' => Hash::make('password'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@accura.io',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_products_get_and_post_contracts(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);

        // Test GET /products
        $response = $this->actingAs($user, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/products');

        $response->assertStatus(200);

        // Test POST /products
        $postRes = $this->actingAs($user, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/products', [
                'name'             => 'Polymer Resin HD-100',
                'hsn_code'         => '39012000',
                'unit'             => 'KGS',
                'base_price'       => 115.50,
                'default_gst_rate' => 18.00,
            ]);

        $postRes->assertStatus(201)
            ->assertJsonPath('name', 'Polymer Resin HD-100');
    }

    public function test_template_warehouse_catalog(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/templates');

        $response->assertStatus(200)
            ->assertJsonStructure(['available_templates', 'default_gst_template', 'default_non_gst_template']);
    }

    public function test_operator_is_forbidden_from_audit_report(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'operator']);

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/reports/audit?format=json');

        $response->assertStatus(403);
    }
}

