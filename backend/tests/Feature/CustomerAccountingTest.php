<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Services\CustomerAccountingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerAccountingTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_summary_and_aging_buckets_calculation(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create([
            'organization_id'  => $org->id,
            'default_due_days' => 30,
        ]);
        $product = Product::factory()->create(['organization_id' => $org->id]);

        $today = Carbon::today();

        // 1. Not Due invoice (dated 10 days ago, due in 20 days)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => $today->copy()->subDays(10)->toDateString(),
            'due_date'        => $today->copy()->addDays(20)->toDateString(),
            'total_amount'    => 1000.00,
            'paid_amount'     => 0.00,
        ]);

        // 2. Overdue 1-30 days invoice (due 15 days ago)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => $today->copy()->subDays(45)->toDateString(),
            'due_date'        => $today->copy()->subDays(15)->toDateString(),
            'total_amount'    => 2000.00,
            'paid_amount'     => 500.00, // partially paid, unpaid = 1500
        ]);

        // 3. Overdue 31-60 days invoice (due 45 days ago)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => $today->copy()->subDays(75)->toDateString(),
            'due_date'        => $today->copy()->subDays(45)->toDateString(),
            'total_amount'    => 3000.00,
            'paid_amount'     => 0.00,
        ]);

        // 4. Fully paid invoice (should not affect outstanding)
        Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'document_type'   => 'invoice',
            'status'          => 'finalized',
            'date'            => $today->copy()->subDays(100)->toDateString(),
            'due_date'        => $today->copy()->subDays(70)->toDateString(),
            'total_amount'    => 4000.00,
            'paid_amount'     => 4000.00,
        ]);

        $service = app(CustomerAccountingService::class);
        $summary = $service->getCustomerSummary($client);

        $this->assertEquals(10000.00, $summary['metrics']['total_invoiced']);
        $this->assertEquals(5500.00, $summary['metrics']['total_outstanding']); // 1000 + 1500 + 3000
        $this->assertEquals(4500.00, $summary['metrics']['overdue_outstanding']); // 1500 + 3000
        $this->assertEquals(2, $summary['metrics']['overdue_invoice_count']);

        $this->assertEquals(1000.00, $summary['aging_buckets']['not_due']);
        $this->assertEquals(1500.00, $summary['aging_buckets']['days_1_30']);
        $this->assertEquals(3000.00, $summary['aging_buckets']['days_31_60']);
    }

    public function test_customer_summary_api_endpoint(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'operator']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson("/api/v1/clients/{$client->id}/summary");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'client',
            'metrics' => ['total_invoiced', 'total_paid', 'total_outstanding', 'overdue_outstanding', 'overdue_invoice_count'],
            'aging_buckets' => ['not_due', 'days_1_30', 'days_31_60', 'days_61_90', 'days_90_plus'],
            'last_invoice',
            'last_payment',
        ]);
    }

    public function test_dashboard_overview_api_endpoint(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/dashboard/overview');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'metrics' => [
                'total_receivables',
                'overdue_receivables',
                'today_collections',
                'this_month_sales',
                'pending_invoices_count',
                'overdue_invoices_count',
                'active_customers_count',
            ],
            'recent_invoices',
            'recent_payments',
            'top_outstanding_customers',
        ]);
    }

    public function test_filtered_payment_history_endpoint(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'admin']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create(['organization_id' => $org->id]);
        Payment::factory()->create([
            'organization_id'    => $org->id,
            'client_id'          => $client->id,
            'amount'             => 500.00,
            'unallocated_amount' => 500.00,
            'payment_mode'       => 'NEFT',
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/payments/history?allocation_status=unallocated');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }
}
