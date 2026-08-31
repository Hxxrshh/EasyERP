<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class PriceIntelligenceService
{
    /**
     * Resolve unit price based on authoritative price intelligence hierarchy:
     * 1. Latest finalized Tax Invoice for THIS client + THIS product
     * 2. Latest finalized Tax Invoice for ANY client in the SAME organization + THIS product
     * 3. Product base_price
     */
    public function resolveUnitPrice(int $organizationId, int $clientId, int $productId): float
    {
        $details = $this->resolveUnitPriceDetails($organizationId, $clientId, $productId);
        return $details['resolved_rate'];
    }

    /**
     * Resolve unit price with detailed source metadata for UI indication
     */
    public function resolveUnitPriceDetails(int $organizationId, int $clientId, int $productId): array
    {
        // 1. Check latest finalized Tax Invoice for THIS client + THIS product
        $clientLastItem = DB::table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.organization_id', $organizationId)
            ->where('invoices.client_id', $clientId)
            ->where('invoices.document_type', 'invoice')
            ->where('invoices.status', 'finalized')
            ->where('invoice_items.product_id', $productId)
            ->orderBy('invoices.date', 'desc')
            ->orderBy('invoices.id', 'desc')
            ->orderBy('invoice_items.id', 'desc')
            ->select('invoice_items.rate', 'invoices.date', 'invoices.invoice_number')
            ->first();

        if ($clientLastItem) {
            $formattedDate = date('d M Y', strtotime($clientLastItem->date));
            $unitRate = (float) $clientLastItem->rate;
            return [
                'resolved_rate'  => $unitRate,
                'source'         => 'client_last_sale',
                'source_label'   => "Last sold to this client · ₹{$unitRate} · {$formattedDate}",
                'last_sale_date' => $clientLastItem->date,
            ];
        }

        // 2. Check latest finalized Tax Invoice for ANY client in SAME organization + THIS product
        $orgLastItem = DB::table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.organization_id', $organizationId)
            ->where('invoices.document_type', 'invoice')
            ->where('invoices.status', 'finalized')
            ->where('invoice_items.product_id', $productId)
            ->orderBy('invoices.date', 'desc')
            ->orderBy('invoices.id', 'desc')
            ->orderBy('invoice_items.id', 'desc')
            ->select('invoice_items.rate', 'invoices.date')
            ->first();

        if ($orgLastItem) {
            $formattedDate = date('d M Y', strtotime($orgLastItem->date));
            $unitRate = (float) $orgLastItem->rate;
            return [
                'resolved_rate'  => $unitRate,
                'source'         => 'org_last_sale',
                'source_label'   => "Latest organization sale · ₹{$unitRate} · {$formattedDate}",
                'last_sale_date' => $orgLastItem->date,
            ];
        }

        // 3. Fallback to product base price
        $product = DB::table('products')
            ->where('id', $productId)
            ->where('organization_id', $organizationId)
            ->first();

        $basePrice = $product ? (float) $product->base_price : 0.00;

        return [
            'resolved_rate'  => $basePrice,
            'source'         => 'base_price',
            'source_label'   => "Base price · ₹{$basePrice}",
            'last_sale_date' => null,
        ];
    }
}
