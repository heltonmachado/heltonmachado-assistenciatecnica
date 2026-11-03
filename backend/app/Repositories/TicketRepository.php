<?php

namespace App\Repositories;

use App\Models\Ticket;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TicketRepository
{
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Ticket::query()
            ->with('client:id,name,email,phone')
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function ($query, $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('code', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhere('device', 'like', "%{$search}%")
                        ->orWhere('issue', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(min(max((int) ($filters['per_page'] ?? 15), 1), 100))
            ->withQueryString();
    }

    public function findOrFail(int $id): Ticket
    {
        return Ticket::query()->findOrFail($id);
    }

    public function create(array $attributes): Ticket
    {
        return Ticket::query()->create($attributes);
    }

    public function delete(Ticket $ticket): void
    {
        $ticket->delete();
    }
}
