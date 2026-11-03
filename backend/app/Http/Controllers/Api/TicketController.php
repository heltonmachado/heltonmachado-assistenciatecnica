<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Http\Requests\UpdateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use App\Services\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TicketController extends Controller
{
    public function __construct(private readonly TicketService $tickets) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return TicketResource::collection($this->tickets->list($request->only(['status', 'search', 'per_page'])));
    }

    public function store(StoreTicketRequest $request): JsonResponse
    {
        return (new TicketResource($this->tickets->create($request->validated(), $request->user()->id)))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $ticket): TicketResource
    {
        return new TicketResource($this->tickets->get($ticket));
    }

    public function update(UpdateTicketRequest $request, Ticket $ticket): TicketResource
    {
        return new TicketResource($this->tickets->update($ticket, $request->validated(), $request->user()->id));
    }

    public function history(Ticket $ticket): JsonResponse
    {
        return response()->json([
            'data' => $ticket->statusHistory()->with('user:id,name')->latest('id')->limit(100)->get(),
        ]);
    }

    public function destroy(Ticket $ticket): Response
    {
        $this->tickets->delete($ticket);

        return response()->noContent();
    }
}
