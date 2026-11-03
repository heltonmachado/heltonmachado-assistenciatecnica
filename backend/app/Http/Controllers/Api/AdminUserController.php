<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminUserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => User::query()->orderBy('name')->get(['id', 'name', 'email', 'is_admin', 'is_active', 'created_at'])]);
    }

    public function store(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:254', 'unique:users,email'],
            'password' => ['required', Password::min(8)->mixedCase()->numbers()->symbols()],
            'is_admin' => ['sometimes', 'boolean'],
        ]);

        $user = User::query()->create([...$attributes, 'is_active' => true]);

        return response()->json(['data' => $user->refresh()->only(['id', 'name', 'email', 'is_admin', 'is_active', 'created_at'])], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $attributes = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email:rfc', 'max:254', Rule::unique('users', 'email')->ignore($user)],
            'password' => ['sometimes', Password::min(8)->mixedCase()->numbers()->symbols()->uncompromised()],
            'is_admin' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($user->is_admin && $user->id === $request->user()->id
            && (($attributes['is_admin'] ?? true) === false || ($attributes['is_active'] ?? true) === false)) {
            abort(422, 'Não é possível remover seus próprios privilégios ou desativar sua conta.');
        }

        if ($user->is_admin && ((isset($attributes['is_admin']) && ! $attributes['is_admin'])
            || (isset($attributes['is_active']) && ! $attributes['is_active']))) {
            $otherActiveAdmins = User::query()
                ->where('is_admin', true)
                ->where('is_active', true)
                ->whereKeyNot($user->id)
                ->exists();
            if (! $otherActiveAdmins) {
                abort(422, 'O sistema precisa manter pelo menos um administrador ativo.');
            }
        }

        $user->update($attributes);
        if (array_key_exists('is_active', $attributes) && ! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json(['data' => $user->refresh()->only(['id', 'name', 'email', 'is_admin', 'is_active', 'created_at'])]);
    }
}
