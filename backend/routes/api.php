<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TicketAttachmentController;
use App\Http\Controllers\Api\TicketController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/tickets/{ticket}/history', [TicketController::class, 'history']);
    Route::get('/tickets/{ticket}/attachments', [TicketAttachmentController::class, 'index']);
    Route::post('/tickets/{ticket}/attachments', [TicketAttachmentController::class, 'store']);
    Route::get('/tickets/{ticket}/attachments/{attachment}/download', [TicketAttachmentController::class, 'download']);
    Route::delete('/tickets/{ticket}/attachments/{attachment}', [TicketAttachmentController::class, 'destroy']);
    Route::apiResource('tickets', TicketController::class);
    Route::get('/reports/overview', [ReportController::class, 'overview']);
    Route::apiResource('clients', ClientController::class)->except(['show']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::patch('/products/{product}', [ProductController::class, 'update']);
    Route::post('/products/{product}/stock', [ProductController::class, 'adjustStock']);
    Route::get('/products/{product}/movements', [ProductController::class, 'movements']);
    Route::get('/finance', [FinanceController::class, 'index']);
    Route::post('/finance', [FinanceController::class, 'store']);
    Route::put('/finance/{entry}', [FinanceController::class, 'update']);
    Route::delete('/finance/{entry}', [FinanceController::class, 'destroy']);
    Route::middleware('admin')->group(function (): void {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::patch('/users/{user}', [AdminUserController::class, 'update']);
    });
});
