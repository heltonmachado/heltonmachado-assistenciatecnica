<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Ticket;
use App\Repositories\TicketRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class TicketService
{
    public function __construct(private readonly TicketRepository $tickets) {}

    public function list(array $filters = []): LengthAwarePaginator
    {
        return $this->tickets->paginate($filters);
    }

    public function get(int $id): Ticket
    {
        return $this->tickets->findOrFail($id);
    }

    public function create(array $attributes, ?int $userId = null): Ticket
    {
        if (isset($attributes['client_id'])) {
            $client = Client::query()->findOrFail($attributes['client_id']);
            $attributes['customer_name'] = $client->name;
            $attributes['phone'] = $client->phone;
        }

        $ticket = $this->tickets->create($attributes);
        $ticket->forceFill([
            'code' => sprintf('AT-%s-%06d', now()->format('Y'), $ticket->id),
        ])->save();
        $ticket->refresh();

        $ticket->statusHistory()->create([
            'from_status' => null,
            'to_status' => $ticket->status,
            'user_id' => $userId,
        ]);

        return $ticket->refresh()->load('client');
    }

    public function update(Ticket $ticket, array $attributes, ?int $userId = null): Ticket
    {
        if (array_key_exists('client_id', $attributes) && $attributes['client_id'] !== null) {
            $client = Client::query()->findOrFail($attributes['client_id']);
            $attributes['customer_name'] = $client->name;
            $attributes['phone'] = $client->phone;
        }

        $previousStatus = $ticket->status;
        $ticket->fill($attributes)->save();
        if ($ticket->wasChanged('status')) {
            $ticket->statusHistory()->create([
                'from_status' => $previousStatus,
                'to_status' => $ticket->status,
                'user_id' => $userId,
            ]);
        }

        return $ticket->refresh()->load('client');
    }

    public function delete(Ticket $ticket): void
    {
        foreach ($ticket->attachments()->get() as $attachment) {
            if (Storage::disk($attachment->disk)->exists($attachment->path)
                && ! Storage::disk($attachment->disk)->delete($attachment->path)) {
                throw new RuntimeException("Não foi possível remover o anexo {$attachment->id}.");
            }
        }

        $this->tickets->delete($ticket);
    }
}
