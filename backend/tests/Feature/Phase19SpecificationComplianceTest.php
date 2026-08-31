<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientProductPrice;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use App\Services\InvoiceLockService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase19SpecificationComplianceTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $adminUser;
    protected Client $client;
    protected Product $product1;
    protected Product $product2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::factory()->create(['name' => 'Apex Industrial Corp', 'state' => 'Gujarat']);
        $this->adminUser = User::factory()->create();
        $this->adminUser->organizations()->attach($this->org->id, ['role' => 'admin']);

        $this->client = Client::factory()->create([
            'organization_id' => $this->org->id,
            'name'            => 'RR Packaging',
            'state'           => 'Gujarat',
        ]);

        $this->product1 = Product::factory()->create([
            'organization_id'  => $this->org->id,
            'name'             => 'HDPE Granules',
            'base_price'       => 100.00,
            'default_gst_rate' => 18.00,
        ]);

        $this->product2 = Product::factory()->create([
            'organization_id'  => $this->org->id,
            'name'             => 'PP Bags',
            'base_price'       => 50.00,
            'default_gst_rate' => 5.00,
        ]);
    }

    public function test_invoice_edit_lock_rule_day_5(): void
    {
        $lockService = app(InvoiceLockService::class);

        // March 12, 2026 invoice -> locks April 6, 2026 at 00:00
        $marInvoice = Invoice::factory()->create([
            'organization_id' => $this->org->id,
            'status'          => 'finalized',
            'date'            => '2026-03-12',
        ]);

        $lockDateMar = $lockService->getLockDate('2026-03-12');
        $this->assertEquals('2026-04-06 00:00:00', $lockDateMar->toDateTimeString());

        // Before lock date (e.g. April 5, 2026) -> NOT locked
        $this->assertFalse($lockService->isLocked($marInvoice, Carbon::parse('2026-04-05 23:59:59')));

        // Exactly at lock date (April 6, 2026 at 00:00:00) -> IS locked
        $this->assertTrue($lockService->isLocked($marInvoice, Carbon::parse('2026-04-06 00:00:00')));

        // December 12, 2026 invoice -> locks January 6, 2027 at 00:00
        $decLockDate = $lockService->getLockDate('2026-12-12');
        $this->assertEquals('2027-01-06 00:00:00', $decLockDate->toDateTimeString());

        // February 15, 2028 (Leap Year) -> locks March 6, 2028 at 00:00
        $leapLockDate = $lockService->getLockDate('2028-02-15');
        $this->assertEquals('2028-03-06 00:00:00', $leapLockDate->toDateTimeString());
    }

    public function test_finalization_updates_client_product_prices_table(): void
    {
        $draftInvoice = Invoice::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
            'status'          => 'draft',
            'date'            => '2026-08-16',
        ]);

        InvoiceItem::create([
            'invoice_id'     => $draftInvoice->id,
            'product_id'     => $this->product1->id,
            'quantity'       => 100,
            'rate'           => 128.00,
            'gst_rate'       => 18.00,
            'taxable_amount' => 12800.00,
            'cgst_amount'    => 1152.00,
            'sgst_amount'    => 1152.00,
            'igst_amount'    => 0.00,
            'amount'         => 15104.00,
        ]);

        // Draft does NOT populate client_product_prices table
        $this->assertDatabaseMissing('client_product_prices', [
            'client_id'  => $this->client->id,
            'product_id' => $this->product1->id,
        ]);

        // Finalize invoice
        $this->actingAs($this->adminUser, 'sanctum');
        $res = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson("/api/v1/invoices/{$draftInvoice->id}/finalize");

        $res->assertStatus(200);

        // ClientProductPrice updated with ₹128.00
        $this->assertDatabaseHas('client_product_prices', [
            'client_id'  => $this->client->id,
            'product_id' => $this->product1->id,
            'last_price' => 128.00,
        ]);
    }

    public function test_formal_credit_note_and_debit_note_issuance(): void
    {
        $finalizedInvoice = Invoice::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
            'status'          => 'finalized',
            'invoice_number'  => 'INV-2026-001',
            'date'            => '2026-08-16',
            'total_amount'    => 11800.00,
        ]);

        $this->actingAs($this->adminUser, 'sanctum');

        // Issue Credit Note
        $cnRes = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson('/api/v1/notes', [
                'invoice_id' => $finalizedInvoice->id,
                'note_type'  => 'credit_note',
                'reason'     => 'Quality tolerance discount granted',
                'items'      => [
                    [
                        'product_id' => $this->product1->id,
                        'quantity'   => 10,
                        'rate'       => 100.00,
                        'gst_rate'   => 18.00,
                    ],
                ],
            ]);

        $cnRes->assertStatus(201);
        $cnRes->assertJsonPath('note_type', 'credit_note');
        $this->assertStringContainsString('CN-', $cnRes->json('note_number'));

        // Issue Debit Note
        $dnRes = $this->withHeader('X-Organization-Id', $this->org->id)
            ->postJson('/api/v1/notes', [
                'invoice_id' => $finalizedInvoice->id,
                'note_type'  => 'debit_note',
                'reason'     => 'Additional freight surcharge',
                'items'      => [
                    [
                        'product_id' => $this->product2->id,
                        'quantity'   => 2,
                        'rate'       => 50.00,
                        'gst_rate'   => 5.00,
                    ],
                ],
            ]);

        $dnRes->assertStatus(201);
        $dnRes->assertJsonPath('note_type', 'debit_note');
        $this->assertStringContainsString('DN-', $dnRes->json('note_number'));
    }
}
