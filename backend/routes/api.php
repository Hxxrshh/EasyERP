<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\LedgerController;
use App\Http\Controllers\Api\MasterController;
use App\Http\Controllers\Api\ParserController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Middleware\EnsureOrganizationAccess;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Unauthenticated Auth Endpoints
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Authenticated User Endpoints
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
    });

    // Authenticated & Organization-Scoped Business Routes
    Route::middleware(['auth:sanctum', EnsureOrganizationAccess::class])->group(function () {
        // Master Registry Endpoints
        Route::get('/meta', [MasterController::class, 'getMeta']);
        Route::get('/price-resolve', [MasterController::class, 'resolvePrice']);

        // WhatsApp Smart Parser
        Route::post('/parser/whatsapp', [ParserController::class, 'parseWhatsApp']);

        // Invoicing & Document Lifecycle Endpoints
        Route::apiResource('invoices', InvoiceController::class);
        Route::post('invoices/{id}/finalize', [InvoiceController::class, 'finalize']);
        Route::post('documents/{id}/convert', [InvoiceController::class, 'convert']);
        Route::post('invoices/{id}/cancel', [InvoiceController::class, 'cancel']);

        // Client Ledgers & Payments
        Route::get('ledgers/{clientId}', [LedgerController::class, 'getClientStatement']);
        Route::get('ledgers/{clientId}/export', [ReportController::class, 'exportLedger']);
        Route::post('payments', [LedgerController::class, 'recordPayment']);
        Route::post('payments/{payment}/allocate', [LedgerController::class, 'allocatePayment']);

        // Reporting, Tax & Audit Exports
        Route::get('reports/invoices', [ReportController::class, 'invoiceRegister']);
        Route::get('reports/gstr1', [ReportController::class, 'gstr1']);
        Route::get('reports/audit', [ReportController::class, 'auditReport']);

        // Audit Trail System
        Route::get('audit-logs', [AuditLogController::class, 'index']);
    });
});