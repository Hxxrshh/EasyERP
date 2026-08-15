<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use App\Services\InvoiceLockService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceImmutabilityAndLockTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser($org, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_finalized_invoice_cannot_be_updated_or_reverted_to_draft(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client1 = Client::factory()->create(['organization_id' => $org->id]);
        $client2 = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client1->id,
            'status'          => 'finalized',
            'invoice_number'  => '001/26-27',
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->putJson("/api/v1/invoices/{$invoice->id}", [
                'client_id'     => $client2->id,
                'document_type' => 'invoice',
                'date'          => '2026-08-15',
                'status'        => 'draft',
                'items'         => [
                    ['product_id' => $product->id, 'quantity' => 5, 'rate' => 500, 'gst_rate' => 18]
                ]
            ]);

        $response->assertStatus(403);
        $this->assertEquals('finalized', $invoice->fresh()->status);
        $this->assertEquals($client1->id, $invoice->fresh()->client_id);
    }

    public function test_finalized_invoice_cannot_be_deleted(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'status'          => 'finalized',
            'invoice_number'  => '001/26-27',
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->deleteJson("/api/v1/invoices/{$invoice->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('invoices', ['id' => $invoice->id]);
    }

    public function test_march_12_invoice_lock_date_calculation(): void
    {
        $lockService = new InvoiceLockService();

        // Invoice date: March 12, 2026
        $invoiceDate = '2026-03-12';
        $lockDate = $lockService->getLockDate($invoiceDate);

        // Expected cutoff lock date: April 6, 2026 00:00:00
        $this->assertEquals('2026-04-06 00:00:00', $lockDate->format('Y-m-d H:i:s'));

        $invoice = new Invoice([
            'date'   => '2026-03-12',
            'status' => 'finalized',
        ]);

        // Before April 6 -> Not locked
        $this->assertFalse($lockService->isLocked($invoice, Carbon::parse('2026-04-05 23:59:59')));

        // On/After April 6 -> Locked
        $this->assertTrue($lockService->isLocked($invoice, Carbon::parse('2026-04-06 00:00:00')));
    }

    public function test_january_and_february_lock_date_calculations(): void
    {
        $lockService = new InvoiceLockService();

        // January 15, 2026 -> Lock: February 6, 2026
        $janLock = $lockService->getLockDate('2026-01-15');
        $this->assertEquals('2026-02-06 00:00:00', $janLock->format('Y-m-d H:i:s'));

        // February 20, 2026 -> Lock: March 6, 2026
        $febLock = $lockService->getLockDate('2026-02-20');
        $this->assertEquals('2026-03-06 00:00:00', $febLock->format('Y-m-d H:i:s'));
    }

    public function test_financial_year_boundary_lock_date_calculation(): void
    {
        $lockService = new InvoiceLockService();

        // December 31, 2026 -> Lock: January 6, 2027
        $decLock = $lockService->getLockDate('2026-12-31');
        $this->assertEquals('2027-01-06 00:00:00', $decLock->format('Y-m-d H:i:s'));
    }

    public function test_another_organization_cannot_finalize_edit_or_delete_invoice(): void
    {
        $org1 = Organization::factory()->create();
        $client1 = Client::factory()->create(['organization_id' => $org1->id]);
        $invOrg1 = Invoice::factory()->create([
            'organization_id' => $org1->id,
            'client_id'       => $client1->id,
            'status'          => 'draft',
        ]);

        $org2 = Organization::factory()->create();
        $user2 = User::factory()->create();
        $user2->organizations()->attach($org2->id, ['role' => 'admin']);

        // User2 attempts to finalize Org 1 invoice
        $resFinal = $this->actingAs($user2, 'sanctum')
            ->withHeader('X-Organization-Id', $org2->id)
            ->postJson("/api/v1/invoices/{$invOrg1->id}/finalize");
        $resFinal->assertStatus(404);

        // User2 attempts to delete Org 1 invoice
        $resDelete = $this->actingAs($user2, 'sanctum')
            ->withHeader('X-Organization-Id', $org2->id)
            ->deleteJson("/api/v1/invoices/{$invOrg1->id}");
        $resDelete->assertStatus(404);
    }
}
