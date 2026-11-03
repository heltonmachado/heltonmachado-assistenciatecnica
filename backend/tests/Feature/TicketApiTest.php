<?php

namespace Tests\Feature;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TicketApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create());
    }

    public function test_it_creates_and_lists_tickets(): void
    {
        $this->postJson('/api/tickets', [
            'customer_name' => 'Maria Silva',
            'phone' => '11999990000',
            'device' => 'Notebook',
            'issue' => 'Troca de tela',
            'priority' => 'high',
            'estimate' => 320.50,
            'diagnosis' => 'Display com defeito.',
            'parts_used' => 'Display compatível 15.6"',
            'estimate_approved' => true,
            'warranty_days' => 90,
        ])
            ->assertCreated()
            ->assertJsonPath('data.customer_name', 'Maria Silva')
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.priority', 'high')
            ->assertJsonPath('data.diagnosis', 'Display com defeito.')
            ->assertJsonPath('data.estimate_approved', true)
            ->assertJsonPath('data.warranty_days', 90)
            ->assertJsonPath('data.code', fn ($code) => str_starts_with($code, 'AT-'));

        $this->getJson('/api/tickets?search=Maria')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.customer_name', 'Maria Silva');
    }

    public function test_it_validates_ticket_input(): void
    {
        $this->postJson('/api/tickets', [
            'customer_name' => '',
            'device' => 'Notebook',
            'issue' => 'Diagnóstico',
            'priority' => 'critical',
            'estimate' => -5,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['customer_name', 'priority', 'estimate']);
    }

    public function test_it_updates_and_deletes_a_ticket(): void
    {
        $ticket = Ticket::query()->create([
            'customer_name' => 'João Souza',
            'device' => 'Celular',
            'issue' => 'Bateria',
            'status' => 'open',
            'priority' => 'normal',
        ]);

        $this->putJson("/api/tickets/{$ticket->id}", [
            'status' => 'completed',
            'estimate' => 99.90,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.estimate', '99.90');

        $this->deleteJson("/api/tickets/{$ticket->id}")->assertNoContent();
        $this->assertDatabaseMissing('tickets', ['id' => $ticket->id]);
    }
}
