<?php

namespace App\Services;

use App\Models\Client;
use App\Models\InvoiceItem;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ProductPriceComparisonService
{
    public function comparePrices(
        int $organizationId,
        int $productId,
        array $clientIds = [],
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $financialYear = null
    ): array {
        $product = Product::where('organization_id', $organizationId)->findOrFail($productId);

        // Date range filtering setup
        if ($financialYear) {
            $parts = explode('-', $financialYear);
            if (count($parts) === 2) {
                $startYear = (int) trim($parts[0]);
                $endYear = (int) trim($parts[1]);
                if (strlen((string) $endYear) === 2) {
                    $endYear = 2000 + $endYear;
                }
                $startDate = "{$startYear}-04-01";
                $endDate = "{$endYear}-03-31";
            }
        }

        // Target clients selection
        $clientQuery = Client::where('organization_id', $organizationId);
        if (!empty($clientIds)) {
            $clientQuery->whereIn('id', $clientIds);
        } else {
            // Default to top clients with sales for this product or all clients in org (limit 20)
            $activeClientIds = DB::table('invoice_items')
                ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
                ->where('invoices.organization_id', $organizationId)
                ->where('invoices.document_type', 'invoice')
                ->where('invoices.status', 'finalized')
                ->where('invoice_items.product_id', $productId)
                ->distinct()
                ->pluck('invoices.client_id')
                ->toArray();

            if (!empty($activeClientIds)) {
                $clientQuery->whereIn('id', $activeClientIds);
            }
        }

        $clients = $clientQuery->orderBy('name')->limit(50)->get();

        $clientComparisons = [];
        $latestRates = [];

        foreach ($clients as $client) {
            $query = DB::table('invoice_items')
                ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
                ->where('invoices.organization_id', $organizationId)
                ->where('invoices.client_id', $client->id)
                ->where('invoices.document_type', 'invoice')
                ->where('invoices.status', 'finalized')
                ->where('invoice_items.product_id', $productId);

            if ($startDate) {
                $query->whereDate('invoices.date', '>=', $startDate);
            }
            if ($endDate) {
                $query->whereDate('invoices.date', '<=', $endDate);
            }

            $sales = $query->orderBy('invoices.date', 'desc')
                ->orderBy('invoices.id', 'desc')
                ->orderBy('invoice_items.id', 'desc')
                ->select(
                    'invoice_items.id as item_id',
                    'invoice_items.rate',
                    'invoice_items.quantity',
                    'invoice_items.gst_rate',
                    'invoices.id as invoice_id',
                    'invoices.invoice_number',
                    'invoices.date'
                )
                ->limit(5)
                ->get();

            $history = $sales->map(function ($s) use ($product) {
                return [
                    'item_id'        => $s->item_id,
                    'invoice_id'     => $s->invoice_id,
                    'invoice_number' => $s->invoice_number,
                    'rate'           => (float) $s->rate,
                    'quantity'       => (float) $s->quantity,
                    'gst_rate'       => (float) $s->gst_rate,
                    'unit'           => $product->unit,
                    'date'           => $s->date,
                    'formatted_date' => date('d M Y', strtotime($s->date)),
                ];
            })->toArray();

            $latestSale = count($history) > 0 ? $history[0] : null;

            if ($latestSale) {
                $latestRates[] = [
                    'client_id'      => $client->id,
                    'client_name'    => $client->name,
                    'company_name'   => $client->company_name,
                    'rate'           => $latestSale['rate'],
                    'date'           => $latestSale['date'],
                    'invoice_number' => $latestSale['invoice_number'],
                ];
            }

            $clientComparisons[] = [
                'client'      => [
                    'id'           => $client->id,
                    'name'         => $client->name,
                    'company_name' => $client->company_name,
                    'short_name'   => $client->short_name,
                    'gst_number'   => $client->gst_number,
                    'is_archived'  => (bool) $client->is_archived,
                ],
                'latest_sale' => $latestSale,
                'history'     => $history,
            ];
        }

        // Compute metrics
        $metrics = [
            'total_clients_compared' => count($clients),
            'clients_with_sales'     => count($latestRates),
            'lowest'                 => null,
            'highest'                => null,
            'average'                => 0.0,
            'spread'                 => 0.0,
            'base_price'             => (float) $product->base_price,
        ];

        if (count($latestRates) > 0) {
            usort($latestRates, fn($a, $b) => $a['rate'] <=> $b['rate']);

            $lowestItem = $latestRates[0];
            $highestItem = $latestRates[count($latestRates) - 1];

            $ratesSum = array_sum(array_column($latestRates, 'rate'));
            $avgRate = round($ratesSum / count($latestRates), 2);
            $spread = round($highestItem['rate'] - $lowestItem['rate'], 2);

            $metrics['lowest'] = [
                'rate'           => $lowestItem['rate'],
                'client_id'      => $lowestItem['client_id'],
                'client_name'    => $lowestItem['client_name'],
                'invoice_number' => $lowestItem['invoice_number'],
                'date'           => $lowestItem['date'],
            ];

            $metrics['highest'] = [
                'rate'           => $highestItem['rate'],
                'client_id'      => $highestItem['client_id'],
                'client_name'    => $highestItem['client_name'],
                'invoice_number' => $highestItem['invoice_number'],
                'date'           => $highestItem['date'],
            ];

            $metrics['average'] = $avgRate;
            $metrics['spread'] = $spread;
        }

        return [
            'product'     => [
                'id'         => $product->id,
                'name'       => $product->name,
                'short_name' => $product->short_name,
                'hsn_code'   => $product->hsn_code,
                'unit'       => $product->unit,
                'base_price' => (float) $product->base_price,
            ],
            'metrics'     => $metrics,
            'comparisons' => $clientComparisons,
        ];
    }
}
