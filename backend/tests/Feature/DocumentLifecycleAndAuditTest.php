<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Services\PaymentFifoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentLifecycleAndAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser($org, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_quote_conversion_to_proforma_challan_and_draft_invoice(): void
    {
        $org = Organization::factory()->create(['state' => 'Gujarat', 'gst_number' => '24AAACC12341ZB']);
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id, 'state' => 'Gujarat']);
        $product = Product::factory()->create(['organization_id' => $org->id, 'base_price' => 1000.00, 'default_gst_rate' => 18.00]);

        // Create Quote
        $quoteRes = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'quote',
                'date'          => '2026-08-15',
                'items'         => [
                    ['product_id' => $product->id, 'quantity' => 2, 'rate' => 1000.00, 'gst_rate' => 18.00]
                ]
            ]);

        $quoteRes->assertStatus(201)
            ->assertJsonPath('document_type', 'quote')
            ->assertJsonPath('status', 'draft')
            ->assertJsonPath('invoice_number', null);

        $quoteId = $quoteRes->json('id');

        // Convert Quote -> Proforma
        $proformaRes = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/documents/{$quoteId}/convert", ['target_type' => 'proforma']);

        $proformaRes->assertStatus(201)
            ->assertJsonPath('document_type', 'proforma')
            ->assertJsonPath('status', 'draft')
            ->assertJsonPath('invoice_number', null);

        // Convert Quote -> Challan
        $challanRes = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/documents/{$quoteId}/convert", ['target_type' => 'challan']);

        $challanRes->assertStatus(201)
            ->assertJsonPath('document_type', 'challan')
            ->assertJsonPath('status', 'draft')
            ->assertJsonPath('invoice_number', null);

        // Convert Quote -> Invoice (Draft Tax Invoice)
        $invRes = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/documents/{$quoteId}/convert", ['target_type' => 'invoice']);

        $invRes->assertStatus(201)
            ->assertJsonPath('document_type', 'invoice')
            ->assertJsonPath('status', 'draft')
            ->assertJsonPath('invoice_number', null);

        $this->assertEquals(2360.00, $invRes->json('total_amount'));
    }

    public function test_proforma_and_challan_conversion_to_invoice(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $proforma = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'proforma',
            'status'          => 'draft',
        ]);
        $proforma->items()->create(['product_id' => $product->id, 'quantity' => 1, 'rate' => 500, 'gst_rate' => 18, 'amount' => 590]);

        $res1 = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/documents/{$proforma->id}/convert", ['target_type' => 'invoice']);

        $res1->assertStatus(201)->assertJsonPath('document_type', 'invoice');

        // Attempt invalid transition proforma -> challan
        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/documents/{$proforma->id}/convert", ['target_type' => 'challan'])
            ->assertStatus(422);
    }

    public function test_converted_tax_invoice_can_be_finalized(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $quote = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'quote',
            'status'          => 'draft',
        ]);
        $quote->items()->create(['product_id' => $product->id, 'quantity' => 1, 'rate' => 500, 'gst_rate' => 18, 'amount' => 590]);

        // Convert to draft invoice
        $convertedRes = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/documents/{$quote->id}/convert", ['target_type' => 'invoice']);

        $convertedId = $convertedRes->json('id');

        // Finalize converted invoice
        $finalRes = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$convertedId}/finalize");

        $finalRes->assertStatus(200)
            ->assertJsonPath('status', 'finalized')
            ->assertJsonPath('invoice_number', '001/26-27');
    }

    public function test_document_cancellation_rules(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Draft cancellation
        $draft = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'quote',
            'status'          => 'draft',
        ]);

        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$draft->id}/cancel")
            ->assertStatus(200)
            ->assertJsonPath('status', 'cancelled');

        // Cancelled doc cannot be converted
        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/documents/{$draft->id}/convert", ['target_type' => 'invoice'])
            ->assertStatus(422);

        // Finalized invoice cancellation
        $finalized = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'invoice_number'  => '001/26-27',
        ]);

        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$finalized->id}/cancel")
            ->assertStatus(200)
            ->assertJsonPath('status', 'cancelled')
            ->assertJsonPath('invoice_number', '001/26-27');

        // Number remains intact in DB and cannot be reused
        $this->assertDatabaseHas('invoices', [
            'id'             => $finalized->id,
            'invoice_number' => '001/26-27',
            'status'         => 'cancelled',
        ]);
    }

    public function test_audit_logging_system(): void
    {
        $org = Organization::factory()->create();
        $user = $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        // 1. Create document
        $invRes = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices', [
                'client_id'     => $client->id,
                'document_type' => 'quote',
                'date'          => '2026-08-15',
                'items'         => [
                    ['product_id' => $product->id, 'quantity' => 1, 'rate' => 100, 'gst_rate' => 18]
                ]
            ]);

        $invId = $invRes->json('id');
        $this->assertDatabaseHas('audit_logs', [
            'organization_id' => $org->id,
            'user_id'         => $user->id,
            'action'          => 'document_created',
            'auditable_id'    => $invId,
        ]);

        // 2. Convert document
        $convRes = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/documents/{$invId}/convert", ['target_type' => 'invoice']);

        $convId = $convRes->json('id');
        $this->assertDatabaseHas('audit_logs', [
            'organization_id' => $org->id,
            'user_id'         => $user->id,
            'action'          => 'document_converted',
            'auditable_id'    => $convId,
        ]);

        // 3. Finalize invoice
        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$convId}/finalize");

        $this->assertDatabaseHas('audit_logs', [
            'organization_id' => $org->id,
            'user_id'         => $user->id,
            'action'          => 'invoice_finalized',
            'auditable_id'    => $convId,
        ]);

        // 4. Cancel document
        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$invId}/cancel");

        $this->assertDatabaseHas('audit_logs', [
            'organization_id' => $org->id,
            'user_id'         => $user->id,
            'action'          => 'document_cancelled',
            'auditable_id'    => $invId,
        ]);

        // Query audit-logs endpoint
        $logsRes = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/audit-logs');

        $logsRes->assertStatus(200)
            ->assertJsonPath('total', 4);
    }

    public function test_auditor_permissions_and_read_only_access(): void
    {
        $org = Organization::factory()->create();
        $auditor = $this->authenticateUser($org, 'auditor');

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Auditor cannot convert
        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/documents/1/convert', ['target_type' => 'invoice'])
            ->assertStatus(403);

        // Auditor cannot cancel
        $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/invoices/1/cancel')
            ->assertStatus(403);

        // Auditor CAN view audit logs
        $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/audit-logs')
            ->assertStatus(200);
    }

    public function test_monetary_hardening_for_decimal_allocations(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);

        $client = Client::factory()->create(['organization_id' => $org->id]);

        // Invoice total 100.10
        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'total_amount'    => 100.10,
            'paid_amount'     => 0.00,
        ]);

        // Payment unallocated 100.10
        $payment = Payment::factory()->create([
            'organization_id'    => $org->id,
            'client_id'          => $client->id,
            'amount'             => 100.10,
            'unallocated_amount' => 100.10,
        ]);

        $fifoService = new PaymentFifoService();

        // 1st allocation: 33.33
        $res1 = $fifoService->allocateManually($payment, $invoice, 33.33);
        $this->assertEquals(66.77, $res1['unallocated_amount']);
        $this->assertEquals(66.77, $res1['invoice_outstanding_amount']);

        // 2nd allocation: 66.77
        $payment->refresh();
        $invoice->refresh();
        $res2 = $fifoService->allocateManually($payment, $invoice, 66.77);
        $this->assertEquals(0.00, $res2['unallocated_amount']);
        $this->assertEquals(0.00, $res2['invoice_outstanding_amount']);

        $this->assertEquals(100.10, $invoice->fresh()->paid_amount);
        $this->assertEquals(0.00, $payment->fresh()->unallocated_amount);
    }
}
