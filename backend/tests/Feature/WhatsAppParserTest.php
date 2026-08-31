<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsAppParserTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_whatsapp_text_parsing(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'operator']);
        $this->actingAs($user, 'sanctum');

        $client = Client::factory()->create([
            'organization_id' => $org->id,
            'short_name'      => 'rr',
            'name'            => 'RR Packaging',
        ]);

        $product1 = Product::factory()->create([
            'organization_id' => $org->id,
            'short_name'      => 'hdpe',
            'name'            => 'HDPE Granules Grade-A',
            'base_price'      => 120.00,
        ]);

        $product2 = Product::factory()->create([
            'organization_id' => $org->id,
            'short_name'      => 'pp_bags',
            'name'            => 'PP Woven Bags 50kg',
            'base_price'      => 80.00,
        ]);

        $rawText = "rr\nhdpe 50\npp_bags 100";

        $res = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/parser/whatsapp', ['raw_text' => $rawText]);

        $res->assertStatus(200);
        $res->assertJsonPath('client.id', $client->id);
        $this->assertCount(2, $res->json('items'));
        $this->assertEquals('HDPE Granules Grade-A', $res->json('items.0.name'));
        $this->assertEquals(50, $res->json('items.0.quantity'));
        $this->assertEquals('PP Woven Bags 50kg', $res->json('items.1.name'));
        $this->assertEquals(100, $res->json('items.1.quantity'));
    }

    public function test_unknown_client_and_product_reporting(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'operator']);
        $this->actingAs($user, 'sanctum');

        $rawText = "unknown_client_code\nunknown_prod_code 10\nmalformed line text";

        $res = $this->withHeader('X-Organization-Id', $org->id)
            ->postJson('/api/v1/parser/whatsapp', ['raw_text' => $rawText]);

        $res->assertStatus(200);
        $res->assertJsonPath('client', null);
        $this->assertNotNull($res->json('client_error'));
        $this->assertCount(2, $res->json('unmatched'));
    }
}
