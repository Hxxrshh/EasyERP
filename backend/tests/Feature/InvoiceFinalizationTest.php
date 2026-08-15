<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientProductPrice;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceFinalizationTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser($org, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_draft_invoice_has_no_sequence_number_until_finalization(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $resDraft = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    ['product_id' => $product->id, 'quantity' => 1, 'rate' => 100, 'gst_rate' => 18]
                ]
            ]);

        $resDraft->assertStatus(201)
            ->assertJsonPath('invoice_number', null)
            ->assertJsonPath('status', 'draft');

        $invoiceId = $resDraft->json('id');

        $resFinal = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$invoiceId}/finalize");

        $resFinal->assertStatus(200)
            ->assertJsonPath('status', 'finalized')
            ->assertJsonPath('invoice_number', '001/26-27');
    }

    public function test_finalization_updates_client_product_price_history(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 100.00]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'draft',
        ]);
        $invoice->items()->create([
            'product_id' => $product->id,
            'quantity'   => 1,
            'rate'       => 250.00,
            'gst_rate'   => 18.00,
            'amount'     => 295.00,
        ]);

        // Prior to finalization, client price history should not exist
        $this->assertDatabaseMissing('client_product_prices', [
            'client_id'  => $client->id,
            'product_id' => $product->id,
        ]);

        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$invoice->id}/finalize")
            ->assertStatus(200);

        // After successful finalization, price history record must exist
        $this->assertDatabaseHas('client_product_prices', [
            'client_id'  => $client->id,
            'product_id' => $product->id,
            'last_price' => 250.00,
        ]);
    }

    public function test_failed_finalization_does_not_consume_sequence_number(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        // Attempting to finalize a non-existent invoice ID
        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices/99999/finalize')
            ->assertStatus(404);

        // First actual valid invoice finalization should still receive 001 sequence
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'draft',
            'date'            => '2026-08-15',
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$invoice->id}/finalize");

        $response->assertStatus(200)
            ->assertJsonPath('invoice_number', '001/26-27');
    }
}
