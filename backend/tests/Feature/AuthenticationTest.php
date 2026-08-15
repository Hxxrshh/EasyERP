<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_business_api_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/meta');
        $response->assertStatus(401);
    }

    public function test_user_can_login_and_retrieve_token(): void
    {
        $user = User::factory()->create([
            'email'    => 'user@example.com',
            'password' => 'secret123',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'user@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_authenticated_user_can_access_authorized_organization(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create();
        $user->organizations()->attach($org->id, ['role' => 'operator']);

        $response = $this->actingAs($user, 'sanctum')
            ->withHeader('X-Organization-Id', $org->id)
            ->getJson('/api/v1/meta');

        $response->assertStatus(200)
            ->assertJsonStructure(['organizations', 'clients', 'products']);
    }

    public function test_authenticated_user_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Successfully logged out.');
    }
}
