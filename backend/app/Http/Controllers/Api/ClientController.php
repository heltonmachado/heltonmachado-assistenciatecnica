<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $clients = Client::query()
            ->withCount('tickets')
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")))
            ->orderBy('name')
            ->paginate(min(max((int) $request->query('per_page', 25), 1), 100))
            ->withQueryString();

        return response()->json($clients);
    }

    public function store(Request $request): JsonResponse
    {
        $client = Client::query()->create($this->validateClient($request));

        return response()->json(['data' => $client], 201);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        $client->update($this->validateClient($request, $client));

        return response()->json(['data' => $client->refresh()]);
    }

    public function destroy(Client $client): JsonResponse
    {
        $client->delete();

        return response()->json(['message' => 'Cliente excluído.']);
    }

    private function validateClient(Request $request, ?Client $client = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'email:rfc', 'max:254', Rule::unique('clients', 'email')->ignore($client)],
            'phone' => ['nullable', 'string', 'max:30'],
            'document' => ['nullable', 'string', 'max:30', Rule::unique('clients', 'document')->ignore($client)],
            'address' => ['nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);
    }
}
