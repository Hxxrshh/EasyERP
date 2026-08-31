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
        Route::get('/search', [MasterController::class, 'globalSearch']);
        Route::get('/price-resolve', [MasterController::class, 'resolvePrice']);
        Route::get('/clients', [MasterController::class, 'getClients']);
        Route::post('/clients', [MasterController::class, 'storeClient']);
        Route::get('/clients/{id}/usage', [MasterController::class, 'getClientUsage']);
        Route::post('/clients/{id}/archive', [MasterController::class, 'archiveClient']);
        Route::post('/clients/{id}/restore', [MasterController::class, 'restoreClient']);
        Route::delete('/clients/{id}', [MasterController::class, 'destroyClient']);

        Route::get('/products', [MasterController::class, 'getProducts']);
        Route::post('/products', [MasterController::class, 'storeProduct']);
        Route::get('/products/{id}/usage', [MasterController::class, 'getProductUsage']);
        Route::post('/products/{id}/archive', [MasterController::class, 'archiveProduct']);
        Route::post('/products/{id}/restore', [MasterController::class, 'restoreProduct']);
        Route::delete('/products/{id}', [MasterController::class, 'destroyProduct']);
        Route::get('/products/{id}/price-comparison', [MasterController::class, 'compareProductPrices']);

        // Organization Management
        Route::get('/organization/settings', [\App\Http\Controllers\Api\OrganizationController::class, 'show']);
        Route::put('/organization/settings', [\App\Http\Controllers\Api\OrganizationController::class, 'update']);
        Route::post('/organizations', [\App\Http\Controllers\Api\OrganizationController::class, 'store']);
        Route::get('/organization/usage', [\App\Http\Controllers\Api\OrganizationController::class, 'getUsage']);
        Route::post('/organization/archive', [\App\Http\Controllers\Api\OrganizationController::class, 'archive']);
        Route::post('/organization/restore', [\App\Http\Controllers\Api\OrganizationController::class, 'restore']);
        Route::delete('/organization', [\App\Http\Controllers\Api\OrganizationController::class, 'destroy']);

        // WhatsApp Smart Parser
        Route::post('/parser/whatsapp', [ParserController::class, 'parseWhatsApp']);

        // Template Engine & Warehouse Endpoints
        Route::get('templates', [\App\Http\Controllers\Api\TemplateController::class, 'index']);
        Route::get('templates/resolve', [\App\Http\Controllers\Api\TemplateController::class, 'resolve']);
        Route::get('templates/preview-demo', [\App\Http\Controllers\Api\TemplateController::class, 'previewDemoHtml']);
        Route::post('organization/templates', [\App\Http\Controllers\Api\TemplateController::class, 'updateDefaults']);
        Route::get('clients/{id}/templates', [\App\Http\Controllers\Api\TemplateController::class, 'getClientTemplates']);
        Route::post('clients/{id}/templates', [\App\Http\Controllers\Api\TemplateController::class, 'setClientTemplate']);
        Route::delete('clients/{id}/templates', [\App\Http\Controllers\Api\TemplateController::class, 'deleteClientTemplate']);
        Route::get('invoices/{id}/pdf', [\App\Http\Controllers\Api\TemplateController::class, 'streamPdf']);
        Route::get('invoices/{id}/preview', [\App\Http\Controllers\Api\TemplateController::class, 'streamPreviewHtml']);
        Route::get('invoices/{id}/prepare-delivery', [\App\Http\Controllers\Api\TemplateController::class, 'prepareDelivery']);

        // Invoicing & Document Lifecycle Endpoints
        Route::apiResource('invoices', InvoiceController::class);
        Route::post('invoices/{id}/finalize', [InvoiceController::class, 'finalize']);
        Route::post('documents/{id}/convert', [InvoiceController::class, 'convert']);
        Route::post('invoices/{id}/cancel', [InvoiceController::class, 'cancel']);

        // Historical Invoice Corrections
        Route::get('corrections', [\App\Http\Controllers\Api\InvoiceCorrectionController::class, 'index']);
        Route::post('invoices/{id}/request-correction', [\App\Http\Controllers\Api\InvoiceCorrectionController::class, 'requestCorrection']);
        Route::post('corrections/{id}/approve', [\App\Http\Controllers\Api\InvoiceCorrectionController::class, 'approve']);
        Route::post('corrections/{id}/apply', [\App\Http\Controllers\Api\InvoiceCorrectionController::class, 'apply']);
        Route::post('corrections/{id}/reject', [\App\Http\Controllers\Api\InvoiceCorrectionController::class, 'reject']);

        // Formal GST Credit Notes & Debit Notes
        Route::get('notes', [\App\Http\Controllers\Api\CreditDebitNoteController::class, 'index']);
        Route::post('notes', [\App\Http\Controllers\Api\CreditDebitNoteController::class, 'store']);
        Route::get('notes/{id}', [\App\Http\Controllers\Api\CreditDebitNoteController::class, 'show']);

        // Customer Accounting & Dashboard Metrics
        Route::get('clients/{id}/summary', [\App\Http\Controllers\Api\CustomerAccountingController::class, 'getClientSummary']);
        Route::get('dashboard/overview', [\App\Http\Controllers\Api\CustomerAccountingController::class, 'getDashboardOverview']);

        // Inventory Management
        Route::get('inventory/summary', [\App\Http\Controllers\Api\InventoryController::class, 'summary']);
        Route::post('inventory/transactions', [\App\Http\Controllers\Api\InventoryController::class, 'recordTransaction']);

        // Client Ledgers & Payments
        Route::get('ledgers/{clientId}', [LedgerController::class, 'getClientStatement']);
        Route::get('ledgers/{clientId}/export', [ReportController::class, 'exportLedger']);
        Route::get('payments/history', [LedgerController::class, 'getPaymentsList']);
        Route::post('payments', [LedgerController::class, 'recordPayment']);
        Route::post('payments/{payment}/allocate', [LedgerController::class, 'allocatePayment']);
        Route::post('payments/{payment}/auto-allocate', [LedgerController::class, 'autoAllocate']);

        // Reporting, Tax & Audit Exports
        Route::get('reports/invoices', [ReportController::class, 'invoiceRegister']);
        Route::get('reports/gstr1', [ReportController::class, 'gstr1']);
        Route::get('reports/audit', [ReportController::class, 'auditReport']);

        // Audit Trail System
        Route::get('audit-logs', [AuditLogController::class, 'index']);
    });
});