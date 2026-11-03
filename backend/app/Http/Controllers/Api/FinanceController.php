<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FinanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $entries = FinanceEntry::query()
            ->with('ticket:id,code')
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('description', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%")))
            ->latest('id')
            ->paginate(min(max((int) $request->query('per_page', 25), 1), 100))
            ->withQueryString();

        return response()->json([
            ...$entries->toArray(),
            'summary' => [
                'income' => (float) FinanceEntry::query()->where('type', 'income')->whereNotNull('paid_at')->sum('amount'),
                'expenses' => (float) FinanceEntry::query()->where('type', 'expense')->whereNotNull('paid_at')->sum('amount'),
                'pending' => FinanceEntry::query()->whereNull('paid_at')->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $entry = FinanceEntry::query()->create([
            ...$this->validateEntry($request),
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $entry], 201);
    }

    public function update(Request $request, FinanceEntry $entry): JsonResponse
    {
        $entry->update($this->validateEntry($request, false));

        return response()->json(['data' => $entry->refresh()]);
    }

    public function destroy(FinanceEntry $entry): JsonResponse
    {
        $entry->delete();

        return response()->json(['message' => 'Lançamento excluído.']);
    }

    private function validateEntry(Request $request, bool $creating = true): array
    {
        return $request->validate([
            'type' => [$creating ? 'required' : 'sometimes', Rule::in(['income', 'expense'])],
            'description' => [$creating ? 'required' : 'sometimes', 'string', 'max:160'],
            'category' => ['nullable', 'string', 'max:80'],
            'amount' => [$creating ? 'required' : 'sometimes', 'numeric', 'gt:0', 'max:99999999.99'],
            'due_date' => ['nullable', 'date'],
            'paid_at' => ['sometimes', 'nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'ticket_id' => ['nullable', 'integer', 'exists:tickets,id'],
        ]);
    }
}
