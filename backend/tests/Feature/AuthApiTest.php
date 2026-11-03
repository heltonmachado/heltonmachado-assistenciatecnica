<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_authenticates_a_user_and_returns_a_limited_lifetime_token(): void
    {
        User::factory()->create([
            'email' => 'heltonmachado2017@gmail.com',
            'password' => '@Helton2026',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'HELTONMACHADO2017@gmail.com',
            'password' => '@Helton2026',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'heltonmachado2017@gmail.com');

        $token = $response->json('token');
        $userName = $response->json('user.name');
        $this->assertIsString($token);
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_type' => User::class,
            'name' => 'web',
        ]);

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.name', $userName);

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_it_rejects_invalid_credentials_without_revealing_the_account(): void
    {
        User::factory()->create(['email' => 'heltonmachado2017@gmail.com']);

        $this->postJson('/api/auth/login', [
            'email' => 'heltonmachado2017@gmail.com',
            'password' => 'wrong-password',
        ])
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'E-mail ou senha inválidos.']);
    }

    public function test_ticket_routes_require_authentication(): void
    {
        $this->get('/api/tickets')
            ->assertUnauthorized()
            ->assertHeader('content-type', 'application/json');
        $this->post('/api/tickets', [])
            ->assertUnauthorized()
            ->assertHeader('content-type', 'application/json');
    }
}
