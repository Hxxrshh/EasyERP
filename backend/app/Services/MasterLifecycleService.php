<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ClientProductPrice;
use App\Models\InventoryTransaction;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Product;
use Exception;
use Illuminate\Support\Facades\DB;

class MasterLifecycleService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    // ----------------------------------------------------------------------
    // CLIENT LIFECYCLE
    // ----------------------------------------------------------------------

    public function checkClientUsage(int $organizationId, int $clientId): array
    {
        $client = Client::where('organization_id', $organizationId)->findOrFail($clientId);

        $invoicesCount = Invoice::where('organization_id', $organizationId)
            ->where('client_id', $clientId)
            ->count();

        $finalizedInvoices = Invoice::where('organization_id', $organizationId)
            ->where('client_id', $clientId)
            ->where('status', 'finalized')
            ->get();

        $outstandingAmount = 0.0;
        foreach ($finalizedInvoices as $inv) {
            $outstandingAmount += max(0, (float) $inv->total_amount - (float) $inv->paid_amount);
        }

        $paymentsCount = Payment::where('organization_id', $organizationId)
            ->where('client_id', $clientId)
            ->count();

        $lastInvoiceDate = Invoice::where('organization_id', $organizationId)
            ->where('client_id', $clientId)
            ->max('date');

        $lastPaymentDate = Payment::where('organization_id', $organizationId)
            ->where('client_id', $clientId)
            ->max('payment_date');

        $lastTxnDate = null;
        if ($lastInvoiceDate && $lastPaymentDate) {
            $lastTxnDate = max($lastInvoiceDate, $lastPaymentDate);
        } else {
            $lastTxnDate = $lastInvoiceDate ?: $lastPaymentDate;
        }

        $hasTransactions = ($invoicesCount > 0 || $paymentsCount > 0);

        return [
            'client_id'              => $client->id,
            'client_name'            => $client->name,
            'is_archived'            => (bool) $client->is_archived,
            'invoices_count'         => $invoicesCount,
            'documents_count'        => $invoicesCount,
            'payments_count'         => $paymentsCount,
            'outstanding_amount'     => round($outstandingAmount, 2),
            'last_transaction_date'  => $lastTxnDate,
            'has_transactions'       => $hasTransactions,
            'can_permanently_delete' => !$hasTransactions,
            'blocking_reason'        => $hasTransactions
                ? "Customer cannot be permanently deleted because historical transactions exist."
                : null,
        ];
    }

    public function archiveClient(int $organizationId, int $clientId, int $userId, ?string $reason = null): Client
    {
        $client = Client::where('organization_id', $organizationId)->findOrFail($clientId);

        if ($client->is_archived) {
            return $client;
        }

        $beforeData = $client->toArray();

        $client->update([
            'is_archived' => true,
            'archived_at' => now(),
            'archived_by' => $userId,
        ]);

        $afterData = $client->fresh()->toArray();
        if ($reason) {
            $afterData['reason'] = $reason;
        }

        $this->auditLogService->log(
            $organizationId,
            $userId,
            'client_archived',
            $client,
            $client->id,
            $beforeData,
            $afterData
        );

        return $client->fresh();
    }

    public function restoreClient(int $organizationId, int $clientId, int $userId): Client
    {
        $client = Client::where('organization_id', $organizationId)->findOrFail($clientId);

        if (!$client->is_archived) {
            return $client;
        }

        $beforeData = $client->toArray();

        $client->update([
            'is_archived' => false,
            'archived_at' => null,
            'archived_by' => null,
        ]);

        $this->auditLogService->log(
            $organizationId,
            $userId,
            'client_restored',
            $client,
            $client->id,
            $beforeData,
            $client->fresh()->toArray()
        );

        return $client->fresh();
    }

    public function deleteClient(int $organizationId, int $clientId, int $userId): bool
    {
        $usage = $this->checkClientUsage($organizationId, $clientId);
        if (!$usage['can_permanently_delete']) {
            throw new Exception("Customer cannot be permanently deleted because historical transactions exist.");
        }

        $client = Client::where('organization_id', $organizationId)->findOrFail($clientId);
        $beforeData = $client->toArray();

        DB::transaction(function () use ($client, $organizationId, $userId, $beforeData) {
            // Clean up non-transactional price overrides if any exist
            ClientProductPrice::where('client_id', $client->id)->delete();
            $client->delete();

            $this->auditLogService->log(
                $organizationId,
                $userId,
                'client_permanently_deleted',
                Client::class,
                $beforeData['id'],
                $beforeData,
                null
            );
        });

        return true;
    }

    // ----------------------------------------------------------------------
    // PRODUCT LIFECYCLE
    // ----------------------------------------------------------------------

    public function checkProductUsage(int $organizationId, int $productId): array
    {
        $product = Product::where('organization_id', $organizationId)->findOrFail($productId);

        $invoiceItemsCount = InvoiceItem::whereHas('invoice', fn($q) => $q->where('organization_id', $organizationId))
            ->where('product_id', $productId)
            ->count();

        $inventoryTxnCount = InventoryTransaction::where('organization_id', $organizationId)
            ->where('product_id', $productId)
            ->count();

        $hasTransactions = ($invoiceItemsCount > 0 || $inventoryTxnCount > 0);

        return [
            'product_id'                   => $product->id,
            'product_name'                 => $product->name,
            'is_archived'                  => (bool) $product->is_archived,
            'invoice_items_count'          => $invoiceItemsCount,
            'inventory_transactions_count' => $inventoryTxnCount,
            'has_transactions'             => $hasTransactions,
            'can_permanently_delete'       => !$hasTransactions,
            'blocking_reason'              => $hasTransactions
                ? "Product cannot be permanently deleted because historical invoice items or inventory transactions exist."
                : null,
        ];
    }

    public function archiveProduct(int $organizationId, int $productId, int $userId, ?string $reason = null): Product
    {
        $product = Product::where('organization_id', $organizationId)->findOrFail($productId);

        if ($product->is_archived) {
            return $product;
        }

        $beforeData = $product->toArray();

        $product->update([
            'is_archived' => true,
            'archived_at' => now(),
            'archived_by' => $userId,
        ]);

        $afterData = $product->fresh()->toArray();
        if ($reason) {
            $afterData['reason'] = $reason;
        }

        $this->auditLogService->log(
            $organizationId,
            $userId,
            'product_archived',
            $product,
            $product->id,
            $beforeData,
            $afterData
        );

        return $product->fresh();
    }

    public function restoreProduct(int $organizationId, int $productId, int $userId): Product
    {
        $product = Product::where('organization_id', $organizationId)->findOrFail($productId);

        if (!$product->is_archived) {
            return $product;
        }

        $beforeData = $product->toArray();

        $product->update([
            'is_archived' => false,
            'archived_at' => null,
            'archived_by' => null,
        ]);

        $this->auditLogService->log(
            $organizationId,
            $userId,
            'product_restored',
            $product,
            $product->id,
            $beforeData,
            $product->fresh()->toArray()
        );

        return $product->fresh();
    }

    public function deleteProduct(int $organizationId, int $productId, int $userId): bool
    {
        $usage = $this->checkProductUsage($organizationId, $productId);
        if (!$usage['can_permanently_delete']) {
            throw new Exception("Product cannot be permanently deleted because historical transactions exist.");
        }

        $product = Product::where('organization_id', $organizationId)->findOrFail($productId);
        $beforeData = $product->toArray();

        DB::transaction(function () use ($product, $organizationId, $userId, $beforeData) {
            ClientProductPrice::where('product_id', $product->id)->delete();
            $product->delete();

            $this->auditLogService->log(
                $organizationId,
                $userId,
                'product_permanently_deleted',
                Product::class,
                $beforeData['id'],
                $beforeData,
                null
            );
        });

        return true;
    }

    // ----------------------------------------------------------------------
    // ORGANIZATION LIFECYCLE
    // ----------------------------------------------------------------------

    public function checkOrganizationUsage(int $organizationId): array
    {
        $org = Organization::findOrFail($organizationId);

        $clientsCount = Client::where('organization_id', $organizationId)->count();
        $productsCount = Product::where('organization_id', $organizationId)->count();
        $invoicesCount = Invoice::where('organization_id', $organizationId)->count();
        $paymentsCount = Payment::where('organization_id', $organizationId)->count();
        $inventoryTxnCount = InventoryTransaction::where('organization_id', $organizationId)->count();

        $hasData = ($clientsCount > 0 || $productsCount > 0 || $invoicesCount > 0 || $paymentsCount > 0 || $inventoryTxnCount > 0);

        return [
            'organization_id'              => $org->id,
            'organization_name'            => $org->name,
            'is_archived'                  => (bool) $org->is_archived,
            'clients_count'                => $clientsCount,
            'products_count'               => $productsCount,
            'invoices_count'               => $invoicesCount,
            'payments_count'               => $paymentsCount,
            'inventory_transactions_count' => $inventoryTxnCount,
            'has_transactions'             => $hasData,
            'can_permanently_delete'       => !$hasData,
            'blocking_reason'              => $hasData
                ? "Organization cannot be permanently deleted because master or historical accounting records exist."
                : null,
        ];
    }

    public function archiveOrganization(int $organizationId, int $userId, ?string $reason = null): Organization
    {
        $org = Organization::findOrFail($organizationId);

        if ($org->is_archived) {
            return $org;
        }

        $beforeData = $org->toArray();

        $org->update([
            'is_archived' => true,
            'archived_at' => now(),
            'archived_by' => $userId,
        ]);

        $afterData = $org->fresh()->toArray();
        if ($reason) {
            $afterData['reason'] = $reason;
        }

        $this->auditLogService->log(
            $organizationId,
            $userId,
            'organization_archived',
            $org,
            $org->id,
            $beforeData,
            $afterData
        );

        return $org->fresh();
    }

    public function restoreOrganization(int $organizationId, int $userId): Organization
    {
        $org = Organization::findOrFail($organizationId);

        if (!$org->is_archived) {
            return $org;
        }

        $beforeData = $org->toArray();

        $org->update([
            'is_archived' => false,
            'archived_at' => null,
            'archived_by' => null,
        ]);

        $this->auditLogService->log(
            $organizationId,
            $userId,
            'organization_restored',
            $org,
            $org->id,
            $beforeData,
            $org->fresh()->toArray()
        );

        return $org->fresh();
    }

    public function deleteOrganization(int $organizationId, int $userId): bool
    {
        $usage = $this->checkOrganizationUsage($organizationId);
        if (!$usage['can_permanently_delete']) {
            throw new Exception("Organization cannot be permanently deleted because master or historical records exist.");
        }

        $org = Organization::findOrFail($organizationId);
        $beforeData = $org->toArray();

        DB::transaction(function () use ($org, $organizationId, $userId, $beforeData) {
            $org->users()->detach();
            $org->delete();

            $this->auditLogService->log(
                $organizationId,
                $userId,
                'organization_permanently_deleted',
                Organization::class,
                $beforeData['id'],
                $beforeData,
                null
            );
        });

        return true;
    }
}
