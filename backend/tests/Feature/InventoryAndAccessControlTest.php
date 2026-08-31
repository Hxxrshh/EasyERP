<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryAndAccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_inventory_transactions_and_stock_calculations(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $product = Product::factory()->create([
            'organization_id' => $org->id,
            'base_price'      => 100.00,
        ]);

        $service = app(InventoryService::class);

        // Record stock in +50
        $service->recordTransaction($org->id, $product->id, 50.0, 'stock_in', 'PO-01', 'Initial stock');
        $this->assertEquals(50, $service->getProductStock($org->id, $product->id));

        // Record stock out -15
        $service->recordTransaction($org->id, $product->id, 15.0, 'stock_out', 'ISSUE-01', 'Manual dispatch');
        $this->assertEquals(35, $service->getProductStock($org->id, $product->id));

        // Summary endpoint
        $res = $this->withHeader('X-Organization-Id', $org->id)->getJson('/api/v1/inventory/summary');
        $res->assertStatus(200);
        $res->assertJsonPath('metrics.total_products', 1);
        $res->assertJsonPath('products.0.available_stock', 35);
    }

    public function test_inventory_stock_deduction_on_finalize_and_restoration_on_cancel(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $service = app(InventoryService::class);
        $service->recordTransaction($org->id, $product->id, 100.0, 'stock_in');
        $this->assertEquals(100.0, $service->getProductStock($org->id, $product->id));

        // Create draft invoice for 20 units
        $invRes = $this->withHeader('X-Organization-Id', $org->id)->postJson('/api/v1/invoices', [
            'client_id'     => $client->id,
            'document_type' => 'invoice',
            'tax_mode'      => 'taxable',
            'date'          => '2026-08-16',
            'items'         => [['product_id' => $product->id, 'quantity' => 20, 'rate' => 100.00, 'gst_rate' => 18.00]],
        ]);
        $invId = $invRes->json('id');

        // Draft invoice does NOT reduce stock
        $this->assertEquals(100.0, $service->getProductStock($org->id, $product->id));

        // Finalize invoice -> stock reduces to 80
        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$invId}/finalize");
        $this->assertEquals(80.0, $service->getProductStock($org->id, $product->id));

        // Cancel invoice -> stock restores to 100
        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$invId}/cancel");
        $this->assertEquals(100.0, $service->getProductStock($org->id, $product->id));
    }

    public function test_audit_trail_access_control_restrictions(): void
    {
        $org = Organization::factory()->create();

        $operatorUser = User::factory()->create();
        $operatorUser->organizations()->attach($org->id, ['role' => 'operator']);

        $adminUser = User::factory()->create();
        $adminUser->organizations()->attach($org->id, ['role' => 'admin']);

        $auditorUser = User::factory()->create();
        $auditorUser->organizations()->attach($org->id, ['role' => 'auditor']);

        // 1. Operator role gets 403 Forbidden
        $this->actingAs($operatorUser, 'sanctum');
        $opAuditLogs = $this->withHeader('X-Organization-Id', $org->id)->getJson('/api/v1/audit-logs');
        $opAuditLogs->assertStatus(403);

        $opAuditReport = $this->withHeader('X-Organization-Id', $org->id)->getJson('/api/v1/reports/audit');
        $opAuditReport->assertStatus(403);

        // 2. Admin role gets 200 OK
        $this->actingAs($adminUser, 'sanctum');
        $adminAuditLogs = $this->withHeader('X-Organization-Id', $org->id)->getJson('/api/v1/audit-logs');
        $adminAuditLogs->assertStatus(200);

        // 3. Auditor role gets 200 OK
        $this->actingAs($auditorUser, 'sanctum');
        $auditorAuditLogs = $this->withHeader('X-Organization-Id', $org->id)->getJson('/api/v1/audit-logs');
        $auditorAuditLogs->assertStatus(200);
    }
}
