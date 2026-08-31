<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_delete_unused_customer_allowed_for_admin(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        $res = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->deleteJson("/api/v1/clients/{$client->id}");

        $res->assertStatus(200);
        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }

    public function test_reject_deletion_of_customer_with_invoices(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
        ]);

        $res = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->deleteJson("/api/v1/clients/{$client->id}");

        $res->assertStatus(422);
        $this->assertDatabaseHas('clients', ['id' => $client->id]);
    }

    public function test_archive_and_restore_customer(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Archive
        $resArchive = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/clients/{$client->id}/archive", ['reason' => 'Duplicate account']);

        $resArchive->assertStatus(200);
        $this->assertDatabaseHas('clients', ['id' => $client->id, 'is_archived' => true]);

        // Restore
        $resRestore = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/clients/{$client->id}/restore");

        $resRestore->assertStatus(200);
        $this->assertDatabaseHas('clients', ['id' => $client->id, 'is_archived' => false]);
    }

    public function test_operator_and_auditor_cannot_archive_or_delete_customer(): void
    {
        $org = Organization::factory()->create();
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $operator = User::factory()->create();
        $operator->organizations()->attach($org->id, ['role' => 'operator']);

        $auditor = User::factory()->create();
        $auditor->organizations()->attach($org->id, ['role' => 'auditor']);

        // Operator attempts archive
        $this->actingAs($operator, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/clients/{$client->id}/archive")
            ->assertStatus(403);

        // Auditor attempts delete
        $this->actingAs($auditor, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->deleteJson("/api/v1/clients/{$client->id}")
            ->assertStatus(403);
    }

    public function test_delete_unused_product_and_reject_used_product_deletion(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $unusedProduct = Product::factory()->create(['organization_id' => $org->id]);
        $usedProduct = Product::factory()->create(['organization_id' => $org->id]);
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
        ]);

        \App\Models\InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $usedProduct->id,
            'quantity'   => 5,
            'rate'       => 100,
            'gst_rate'   => 18,
        ]);

        // Delete unused
        $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->deleteJson("/api/v1/products/{$unusedProduct->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('products', ['id' => $unusedProduct->id]);

        // Delete used product (blocked)
        $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->deleteJson("/api/v1/products/{$usedProduct->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('products', ['id' => $usedProduct->id]);
    }

    public function test_archive_and_restore_product(): void
    {
        $org = Organization::factory()->create();
        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $product = Product::factory()->create(['organization_id' => $org->id]);

        // Archive
        $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/products/{$product->id}/archive")
            ->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $product->id, 'is_archived' => true]);

        // Restore
        $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/products/{$product->id}/restore")
            ->assertStatus(200);

        $this->assertDatabaseHas('products', ['id' => $product->id, 'is_archived' => false]);
    }

    public function test_organization_archival_and_deletion_protection(): void
    {
        $org = Organization::factory()->create(['name' => 'Laxmi Ratan Material Trading']);
        $admin = User::factory()->create();
        $admin->organizations()->attach($org->id, ['role' => 'admin']);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Attempt deletion when client exists (blocked)
        $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->deleteJson("/api/v1/organization", ['confirm_name' => 'Laxmi Ratan Material Trading'])
            ->assertStatus(422);

        // Archive organization
        $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/organization/archive")
            ->assertStatus(200);

        $this->assertDatabaseHas('organizations', ['id' => $org->id, 'is_archived' => true]);

        // Restore organization
        $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/organization/restore")
            ->assertStatus(200);

        $this->assertDatabaseHas('organizations', ['id' => $org->id, 'is_archived' => false]);
    }
}
