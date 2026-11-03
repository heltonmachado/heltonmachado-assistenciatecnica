<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinanceEntry;
use App\Models\Product;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        $from = $filters['from'] ?? now()->startOfMonth()->toDateString();
        $to = $filters['to'] ?? now()->toDateString();

        $tickets = Ticket::query()->whereDate('created_at', '>=', $from)->whereDate('created_at', '<=', $to);
        $paidEntries = FinanceEntry::query()->whereNotNull('paid_at')->whereDate('paid_at', '>=', $from)->whereDate('paid_at', '<=', $to);
        $pending = FinanceEntry::query()->whereNull('paid_at')->whereDate('due_date', '>=', $from)->whereDate('due_date', '<=', $to);

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'tickets' => [
                'total' => (clone $tickets)->count(),
                'by_status' => (clone $tickets)->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
            ],
            'finance' => [
                'income' => (float) (clone $paidEntries)->where('type', 'income')->sum('amount'),
                'expenses' => (float) (clone $paidEntries)->where('type', 'expense')->sum('amount'),
                'pending' => $pending->count(),
            ],
            'inventory' => [
                'low_stock' => Product::query()->whereColumn('stock', '<=', 'minimum_stock')->count(),
            ],
        ]);
    }
}
