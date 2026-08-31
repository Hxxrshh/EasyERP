<?php

namespace App\Services;

use App\Models\InventoryTransaction;
use App\Models\Invoice;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    /**
     * Get authoritative calculated available stock for a product in an organization.
     */
    public function getProductStock(int $orgId, int $productId): float
    {
        $transactions = InventoryTransaction::where('organization_id', $orgId)
            ->where('product_id', $productId)
            ->get();

        $stock = 0.0;
        foreach ($transactions as $txn) {
            if (in_array($txn->type, ['opening_stock', 'stock_in'])) {
                $stock += $txn->quantity;
            } elseif ($txn->type === 'stock_out') {
                $stock -= $txn->quantity;
            } elseif ($txn->type === 'adjustment') {
                $stock += $txn->quantity;
            }
        }

        return round($stock, 2);
    }

    /**
     * Record a new inventory movement transaction.
     */
    public function recordTransaction(
        int $orgId,
        int $productId,
        float $quantity,
        string $type,
        ?string $reference = null,
        ?string $notes = null,
        ?int $userId = null
    ): InventoryTransaction {
        $product = Product::where('id', $productId)->where('organization_id', $orgId)->firstOrFail();

        return InventoryTransaction::create([
            'organization_id' => $orgId,
            'product_id'       => $productId,
            'quantity'         => $quantity,
            'unit'             => $product->unit ?: 'KGS',
            'type'             => $type,
            'reference'        => $reference,
            'date'             => date('Y-m-d'),
            'notes'            => $notes,
            'created_by'       => $userId,
        ]);
    }

    /**
     * Deduct stock upon invoice finalization for sales invoices & delivery challans.
     */
    public function handleInvoiceFinalization(Invoice $invoice, ?int $userId = null): void
    {
        if (!in_array($invoice->document_type, ['invoice', 'challan'])) {
            return; // Quotes and Proformas do not reduce physical inventory stock
        }

        $invoice->loadMissing('items.product');

        foreach ($invoice->items as $item) {
            if ($item->product_id && $item->quantity > 0) {
                $this->recordTransaction(
                    $invoice->organization_id,
                    $item->product_id,
                    (float) $item->quantity,
                    'stock_out',
                    $invoice->invoice_number ?: "INV-#{$invoice->id}",
                    "Stock deduction for finalized {$invoice->document_type} #{$invoice->invoice_number}",
                    $userId
                );
            }
        }
    }

    /**
     * Restore stock if a finalized invoice is cancelled.
     */
    public function handleInvoiceCancellation(Invoice $invoice, ?int $userId = null): void
    {
        if (!in_array($invoice->document_type, ['invoice', 'challan'])) {
            return;
        }

        $invoice->loadMissing('items.product');

        foreach ($invoice->items as $item) {
            if ($item->product_id && $item->quantity > 0) {
                $this->recordTransaction(
                    $invoice->organization_id,
                    $item->product_id,
                    (float) $item->quantity,
                    'stock_in',
                    "CANCEL: " . ($invoice->invoice_number ?: "INV-#{$invoice->id}"),
                    "Stock restored due to document cancellation #{$invoice->invoice_number}",
                    $userId
                );
            }
        }
    }

    /**
     * Get inventory dashboard summary and product stock levels.
     */
    public function getInventoryOverview(int $orgId): array
    {
        $products = Product::where('organization_id', $orgId)->get();

        $inStockCount = 0;
        $lowStockCount = 0;
        $outOfStockCount = 0;
        $summaryList = [];

        foreach ($products as $prod) {
            $available = $this->getProductStock($orgId, $prod->id);
            $minAlert = (float) ($prod->min_stock_alert ?? 10.0);

            $status = 'in_stock';
            if ($available <= 0) {
                $status = 'out_of_stock';
                $outOfStockCount++;
            } elseif ($available <= $minAlert) {
                $status = 'low_stock';
                $lowStockCount++;
            } else {
                $inStockCount++;
            }

            $lastTxn = InventoryTransaction::where('organization_id', $orgId)
                ->where('product_id', $prod->id)
                ->latest()
                ->first();

            $summaryList[] = [
                'id'              => $prod->id,
                'name'            => $prod->name,
                'hsn_code'        => $prod->hsn_code,
                'unit'            => $prod->unit,
                'base_price'      => (float) $prod->base_price,
                'available_stock' => $available,
                'min_stock_alert' => $minAlert,
                'status'          => $status,
                'last_movement'   => $lastTxn ? $lastTxn->date->format('Y-m-d') : null,
            ];
        }

        $recentTransactions = InventoryTransaction::with('product')
            ->where('organization_id', $orgId)
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($t) {
                return [
                    'id'           => $t->id,
                    'product_name' => $t->product?->name ?? "Product #{$t->product_id}",
                    'quantity'     => $t->quantity,
                    'unit'         => $t->unit,
                    'type'         => $t->type,
                    'reference'    => $t->reference,
                    'date'         => $t->date->format('Y-m-d'),
                    'notes'        => $t->notes,
                ];
            });

        return [
            'metrics' => [
                'total_products'     => count($products),
                'in_stock_count'     => $inStockCount,
                'low_stock_count'    => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
            ],
            'recent_transactions' => $recentTransactions,
            'products'            => $summaryList,
        ];
    }
}
