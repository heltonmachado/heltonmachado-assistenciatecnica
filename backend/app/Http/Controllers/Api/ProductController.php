<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $products = Product::query()
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%")))
            ->orderBy('name')
            ->paginate(min(max((int) $request->query('per_page', 25), 1), 100))
            ->withQueryString();

        return response()->json($products);
    }

    public function store(Request $request): JsonResponse
    {
        $attributes = $request->validate($this->productRules());
        $initialStock = $attributes['stock'] ?? 0;
        $product = DB::transaction(function () use ($attributes, $initialStock, $request): Product {
            $product = Product::query()->create($attributes);
            if ($initialStock > 0) {
                $this->recordMovement($product, 'in', $initialStock, 'Estoque inicial', $request->user()->id);
            }

            return $product;
        });

        return response()->json(['data' => $product], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $attributes = $request->validate($this->productRules($product));
        if (array_key_exists('stock', $attributes)) {
            unset($attributes['stock']);
        }
        $product->update($attributes);

        return response()->json(['data' => $product->refresh()]);
    }

    public function adjustStock(Request $request, Product $product): JsonResponse
    {
        $attributes = $request->validate([
            'type' => ['required', Rule::in(['in', 'out'])],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'reason' => ['required', 'string', 'max:160'],
        ]);

        $updated = DB::transaction(function () use ($product, $attributes, $request): Product {
            $lockedProduct = Product::query()->lockForUpdate()->findOrFail($product->id);
            $newStock = $lockedProduct->stock + ($attributes['type'] === 'in' ? $attributes['quantity'] : -$attributes['quantity']);

            if ($newStock < 0) {
                abort(422, 'Estoque insuficiente para essa saída.');
            }

            $lockedProduct->update(['stock' => $newStock]);
            $this->recordMovement($lockedProduct, $attributes['type'], $attributes['quantity'], $attributes['reason'], $request->user()->id);

            return $lockedProduct->refresh();
        });

        return response()->json(['data' => $updated]);
    }

    public function movements(Product $product): JsonResponse
    {
        return response()->json([
            'data' => $product->movements()->with('user:id,name')->latest()->limit(100)->get(),
        ]);
    }

    private function productRules(?Product $product = null): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'sku' => ['required', 'string', 'max:60', Rule::unique('products', 'sku')->ignore($product)],
            'category' => ['nullable', 'string', 'max:80'],
            'stock' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'minimum_stock' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'unit_price' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
        ];
    }

    private function recordMovement(Product $product, string $type, int $quantity, string $reason, int $userId): void
    {
        StockMovement::query()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'type' => $type,
            'quantity' => $quantity,
            'reason' => $reason,
            'user_id' => $userId,
        ]);
    }
}
