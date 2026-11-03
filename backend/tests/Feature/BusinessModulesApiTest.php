<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\FinanceEntry;
use App\Models\Product;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessModulesApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['is_admin' => true]);
        Sanctum::actingAs($this->admin);
    }

    public function test_it_links_tickets_to_clients_and_tracks_status_history(): void
    {
        $client = Client::query()->create([
            'name' => 'Maria Silva',
            'email' => 'maria@example.com',
            'phone' => '11999990000',
        ]);

        $ticket = $this->postJson('/api/tickets', [
            'client_id' => $client->id,
            'device' => 'Notebook',
            'issue' => 'Troca de tela',
        ])
            ->assertCreated()
            ->assertJsonPath('data.client.id', $client->id)
            ->assertJsonPath('data.customer_name', 'Maria Silva')
            ->assertJsonPath('data.phone', '11999990000')
            ->json('data');

        $this->patchJson("/api/tickets/{$ticket['id']}", ['status' => 'in_progress'])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->getJson("/api/tickets/{$ticket['id']}/history")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.from_status', 'open')
            ->assertJsonPath('data.0.to_status', 'in_progress');

        $this->getJson('/api/clients')->assertOk()->assertJsonPath('data.0.tickets_count', 1);
        $this->putJson("/api/clients/{$client->id}", ['name' => 'Maria Silva Atualizada'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Maria Silva Atualizada');
        $this->deleteJson("/api/clients/{$client->id}")->assertOk();
        $this->assertDatabaseHas('tickets', ['id' => $ticket['id'], 'client_id' => null]);
    }

    public function test_it_registers_stock_movements_and_prevents_negative_stock(): void
    {
        $product = $this->postJson('/api/products', [
            'name' => 'Tela de notebook',
            'sku' => 'TELA-001',
            'stock' => 3,
            'minimum_stock' => 1,
            'unit_cost' => 100,
            'unit_price' => 180,
        ])
            ->assertCreated()
            ->assertJsonPath('data.stock', 3)
            ->json('data');

        $this->postJson("/api/products/{$product['id']}/stock", [
            'type' => 'out',
            'quantity' => 2,
            'reason' => 'Uso em manutenção',
        ])
            ->assertOk()
            ->assertJsonPath('data.stock', 1);

        $this->postJson("/api/products/{$product['id']}/stock", [
            'type' => 'out',
            'quantity' => 2,
            'reason' => 'Quantidade indisponível',
        ])->assertUnprocessable();

        $this->getJson("/api/products/{$product['id']}/movements")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_it_creates_finance_entries_and_summarizes_paid_transactions(): void
    {
        $entry = $this->postJson('/api/finance', [
            'type' => 'income',
            'description' => 'Reparo de notebook',
            'category' => 'Serviços',
            'amount' => 250.50,
            'paid_at' => now()->toISOString(),
        ])
            ->assertCreated()
            ->json('data');

        $this->getJson('/api/finance')
            ->assertOk()
            ->assertJsonPath('summary.income', 250.5)
            ->assertJsonPath('summary.pending', 0);

        $this->deleteJson("/api/finance/{$entry['id']}")->assertOk();
    }

    public function test_only_admins_can_manage_users_and_cannot_disable_themselves(): void
    {
        $this->getJson('/api/users')->assertOk();

        $this->patchJson("/api/users/{$this->admin->id}", ['is_active' => false])
            ->assertUnprocessable();

        $this->postJson('/api/users', [
            'name' => 'Técnico',
            'email' => 'tecnico@example.com',
            'password' => 'Seguro@2026',
        ])
            ->assertCreated()
            ->assertJsonPath('data.is_admin', false);

        $managedUser = User::query()->where('email', 'tecnico@example.com')->firstOrFail();
        $managedUser->createToken('test-device');
        $this->patchJson("/api/users/{$managedUser->id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
        $this->assertSame(0, $managedUser->tokens()->count());

        Sanctum::actingAs(User::factory()->create(['is_admin' => false]));
        $this->getJson('/api/users')->assertForbidden();
    }

    public function test_ticket_attachments_are_private_scoped_and_deleted_with_the_ticket(): void
    {
        Storage::fake('local');
        $ticket = Ticket::query()->create([
            'customer_name' => 'Ana Lima',
            'device' => 'Notebook',
            'issue' => 'Reparo',
        ]);

        $attachment = $this->post("/api/tickets/{$ticket->id}/attachments", [
            'files' => [UploadedFile::fake()->createWithContent('laudo.pdf', '%PDF-1.4 laudo')],
        ])->assertCreated()->json('data.0');

        $this->getJson("/api/tickets/{$ticket->id}/attachments")
            ->assertOk()
            ->assertJsonPath('data.0.original_name', 'laudo.pdf');
        $this->get("/api/tickets/{$ticket->id}/attachments/{$attachment['id']}/download")->assertOk();
        $this->get("/api/tickets/{$ticket->id}/attachments/999/download")->assertNotFound();
        $this->postJson("/api/tickets/{$ticket->id}/attachments", [
            'files' => [UploadedFile::fake()->create('script.html', 2)],
        ])->assertUnprocessable();

        $this->deleteJson("/api/tickets/{$ticket->id}")->assertNoContent();
        $this->assertDatabaseMissing('ticket_attachments', ['id' => $attachment['id']]);
        Storage::disk('local')->assertDirectoryEmpty("tickets/{$ticket->id}");
    }

    public function test_report_returns_period_totals_and_product_lists_are_paginated(): void
    {
        Ticket::query()->create([
            'customer_name' => 'Cliente relatório',
            'device' => 'Celular',
            'issue' => 'Tela',
            'status' => 'completed',
            'created_at' => now()->startOfMonth()->addDay(),
        ]);
        FinanceEntry::query()->create([
            'type' => 'income',
            'description' => 'Serviço concluído',
            'amount' => 300,
            'paid_at' => now(),
            'user_id' => $this->admin->id,
        ]);
        Product::query()->create([
            'name' => 'Peça com estoque baixo',
            'sku' => 'LOW-001',
            'stock' => 1,
            'minimum_stock' => 2,
        ]);

        $this->getJson('/api/reports/overview?from='.now()->startOfMonth()->toDateString().'&to='.now()->toDateString())
            ->assertOk()
            ->assertJsonPath('tickets.total', 1)
            ->assertJsonPath('tickets.by_status.completed', 1)
            ->assertJsonPath('finance.income', 300)
            ->assertJsonPath('inventory.low_stock', 1);
        $this->getJson('/api/reports/overview?from=2026-11-10&to=2026-11-01')->assertUnprocessable();
        $this->getJson('/api/products?per_page=1')->assertOk()->assertJsonPath('per_page', 1);
        $this->getJson('/api/finance?per_page=1')->assertOk()->assertJsonPath('per_page', 1);
    }
}
