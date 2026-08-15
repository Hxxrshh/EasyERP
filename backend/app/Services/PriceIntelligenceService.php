<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class PriceIntelligenceService
{
    /**
     * Resolve unit price based on price intelligence hierarchy:
     * 1. Client-specific custom price from `client_product_prices`
     * 2. Last billed price in finalized `invoices` & `invoice_items`
     * 3. Product base price from `products`
     */
    public function resolveUnitPrice(int $organizationId, int $clientId, int $productId): float
    {
        // 1. Check client_product_prices for ($clientId, $productId)
        $clientPrice = DB::table('client_product_prices')
            ->where('client_id', $clientId)
            ->where('product_id', $productId)
            ->value('last_price');

        if ($clientPrice !== null) {
            return (float) $clientPrice;
        }

        // 2. Check latest invoice_items joined with finalized invoices for $productId and $organizationId
        $lastBilledPrice = DB::table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.organization_id', $organizationId)
            ->where('invoices.status', 'finalized')
            ->where('invoice_items.product_id', $productId)
            ->orderBy('invoices.date', 'desc')
            ->orderBy('invoice_items.id', 'desc')
            ->value('invoice_items.rate');

        if ($lastBilledPrice !== null) {
            return (float) $lastBilledPrice;
        }

        // 3. Fallback to products.base_price
        $product = DB::table('products')
            ->where('id', $productId)
            ->where('organization_id', $organizationId)
            ->first();

        if ($product !== null) {
            return (float) $product->base_price;
        }

        return 0.00;
    }
}
