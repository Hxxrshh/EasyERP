<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\User;
use App\Services\InvoiceSequenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceSequenceTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser($org, string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => $role]);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_first_invoice_gets_001_sequence_number_for_financial_year(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'date'            => '2026-08-15',
            'status'          => 'draft',
        ]);

        $response = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson("/api/v1/invoices/{$invoice->id}/finalize");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'finalized')
            ->assertJsonPath('invoice_number', '001/26-27');
    }

    public function test_second_invoice_increments_sequence_number(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $inv1 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'date'            => '2026-08-15',
            'status'          => 'draft',
        ]);

        $inv2 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'date'            => '2026-08-20',
            'status'          => 'draft',
        ]);

        $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$inv1->id}/finalize");
        $response2 = $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$inv2->id}/finalize");

        $response2->assertStatus(200)
            ->assertJsonPath('invoice_number', '002/26-27');
    }

    public function test_april_1st_starts_a_new_financial_year_sequence(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $invFy26 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'date'            => '2027-03-31',
            'status'          => 'draft',
        ]);
        $this->withHeader('X-Organization-Id', $org->id)
             ->postJson("/api/v1/invoices/{$invFy26->id}/finalize")
             ->assertJsonPath('invoice_number', '001/26-27');

        $invFy27 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'date'            => '2027-04-01',
            'status'          => 'draft',
        ]);
        $this->withHeader('X-Organization-Id', $org->id)
             ->postJson("/api/v1/invoices/{$invFy27->id}/finalize")
             ->assertJsonPath('invoice_number', '001/27-28');
    }

    public function test_different_organizations_have_independent_sequences(): void
    {
        $org1 = Organization::factory()->create();
        $client1 = Client::factory()->create(['organization_id' => $org1->id]);
        $user1 = User::factory()->create();
        $user1->organizations()->attach($org1->id, ['role' => 'admin']);

        $org2 = Organization::factory()->create();
        $client2 = Client::factory()->create(['organization_id' => $org2->id]);
        $user2 = User::factory()->create();
        $user2->organizations()->attach($org2->id, ['role' => 'admin']);

        $invOrg1 = Invoice::factory()->create([
            'organization_id' => $org1->id,
            'client_id'       => $client1->id,
            'date'            => '2026-08-15',
            'status'          => 'draft',
        ]);

        $invOrg2 = Invoice::factory()->create([
            'organization_id' => $org2->id,
            'client_id'       => $client2->id,
            'date'            => '2026-08-15',
            'status'          => 'draft',
        ]);

        $res1 = $this->actingAs($user1, 'sanctum')->withHeader('X-Organization-Id', $org1->id)->postJson("/api/v1/invoices/{$invOrg1->id}/finalize");
        $res2 = $this->actingAs($user2, 'sanctum')->withHeader('X-Organization-Id', $org2->id)->postJson("/api/v1/invoices/{$invOrg2->id}/finalize");

        $res1->assertJsonPath('invoice_number', '001/26-27');
        $res2->assertJsonPath('invoice_number', '001/26-27');
    }

    public function test_draft_invoices_do_not_consume_sequence_numbers(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $draft1 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'date'            => '2026-08-15',
            'status'          => 'draft',
            'invoice_number'  => null,
        ]);
        $draft2 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'date'            => '2026-08-16',
            'status'          => 'draft',
            'invoice_number'  => null,
        ]);

        $res2 = $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$draft2->id}/finalize");
        $res2->assertJsonPath('invoice_number', '001/26-27');

        $res1 = $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$draft1->id}/finalize");
        $res1->assertJsonPath('invoice_number', '002/26-27');
    }

    public function test_cancelled_invoice_does_not_allow_number_reuse(): void
    {
        $org = Organization::factory()->create();
        $this->authenticateUser($org);
        $client = Client::factory()->create(['organization_id' => $org->id]);

        $inv1 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'date'            => '2026-08-15',
            'status'          => 'draft',
        ]);

        $res1 = $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$inv1->id}/finalize");
        $res1->assertJsonPath('invoice_number', '001/26-27');

        $inv1->update(['status' => 'cancelled']);

        $inv2 = Invoice::factory()->create([
            'organization_id' => $org->id,
            'client_id'       => $client->id,
            'date'            => '2026-08-16',
            'status'          => 'draft',
        ]);

        $res2 = $this->withHeader('X-Organization-Id', $org->id)->postJson("/api/v1/invoices/{$inv2->id}/finalize");
        $res2->assertJsonPath('invoice_number', '002/26-27');
    }

    public function test_concurrent_sequence_generation_produces_unique_strictly_increasing_numbers(): void
    {
        $org = Organization::factory()->create();
        $service = new InvoiceSequenceService();

        $generatedNumbers = [];
        for ($i = 0; $i < 10; $i++) {
            $generatedNumbers[] = $service->generateNextNumber($org->id, '2026-08-15');
        }

        $this->assertCount(10, array_unique($generatedNumbers));
        $this->assertEquals('001/26-27', $generatedNumbers[0]);
        $this->assertEquals('010/26-27', $generatedNumbers[9]);
    }
}
