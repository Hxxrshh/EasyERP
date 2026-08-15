<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_and_operator_can_create_invoice(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $operator = User::factory()->create();
        $operator->organizations()->attach($org->id, ['role' => 'operator']);

        // Admin creation
        $resAdmin = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    ['product_id' => $product->id, 'quantity' => 1, 'rate' => 100, 'gst_rate' => 18]
                ]
            ]);
        $resAdmin->assertStatus(201);

        // Operator creation
        $resOperator = $this->actingAs($operator, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    ['product_id' => $product->id, 'quantity' => 1, 'rate' => 100, 'gst_rate' => 18]
                ]
            ]);
        $resOperator->assertStatus(201);
    }

    public function test_auditor_cannot_create_finalize_or_delete_invoices(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $auditor = User::factory()->create();
        $auditor->organizations()->attach($org->id, ['role' => 'auditor']);

        // Create attempt
        $resCreate = $this->actingAs($auditor, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'items'         => [
                    ['product_id' => $product->id, 'quantity' => 1, 'rate' => 100, 'gst_rate' => 18]
                ]
            ]);
        $resCreate->assertStatus(403);

        // Finalize & Delete attempts on existing invoice
        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'draft',
        ]);

        $resFinalize = $this->actingAs($auditor, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$invoice->id}/finalize");
        $resFinalize->assertStatus(403);

        $resDelete = $this->actingAs($auditor, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->deleteJson("/api/v1/invoices/{$invoice->id}");
        $resDelete->assertStatus(403);
    }

    public function test_auditor_cannot_record_payment(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $auditor = User::factory()->create();
        $auditor->organizations()->attach($org->id, ['role' => 'auditor']);

        $resPayment = $this->actingAs($auditor, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/payments', [
                'client_id'             => $client->id,
                'amount'                => 100.00,
                'payment_date'          => '2026-08-15',
                'payment_mode'          => 'UPI',
                'transaction_reference' => 'TXN123',
            ]);

        $resPayment->assertStatus(403);
    }

    public function test_auditor_can_read_finalized_records_but_not_drafts(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $auditor = User::factory()->create();
        $auditor->organizations()->attach($org->id, ['role' => 'auditor']);

        $draft = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'draft',
        ]);

        $finalized = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'invoice_number'  => '001/26-27',
        ]);

        // Draft invoice show should return 404 for auditor
        $resDraft = $this->actingAs($auditor, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/invoices/{$draft->id}");
        $resDraft->assertStatus(404);

        // Finalized invoice show should return 200 for auditor
        $resFinalized = $this->actingAs($auditor, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/invoices/{$finalized->id}");
        $resFinalized->assertStatus(200)
            ->assertJsonPath('id', $finalized->id);

        // Invoice list index should only contain finalized invoices for auditor
        $resList = $this->actingAs($auditor, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/invoices');

        $resList->assertStatus(200);
        $data = $resList->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($finalized->id, $data[0]['id']);
    }
}
