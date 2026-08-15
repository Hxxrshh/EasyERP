<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Product;
use App\Services\PriceIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParserController extends Controller
{
    public function parseWhatsApp(Request $request, PriceIntelligenceService $priceService): JsonResponse
    {
        $request->validate([
            'raw_text' => 'required|string',
        ]);

        $lines = array_values(array_filter(array_map('trim', explode("\n", $request->raw_text))));
        if (empty($lines)) {
            return response()->json(['message' => 'Empty text payload'], 422);
        }

        $orgId = (int) $request->attributes->get('active_organization_id');

        // Line 1: Match Client
        $clientShort = strtolower($lines[0]);
        $client = Client::where('organization_id', $orgId)
            ->whereRaw('LOWER(short_name) = ?', [$clientShort])
            ->first();

        $items = [];
        $unmatched = [];

        // Lines 2..N: Match Items & Quantities
        for ($i = 1; $i < count($lines); $i++) {
            $line = $lines[$i];
            if (preg_match('/^(.*?)\s+(\d+(\.\d+)?)$/', $line, $matches)) {
                $productShort = strtolower(trim($matches[1]));
                $quantity = (float)$matches[2];

                $product = Product::where('organization_id', $orgId)
                    ->whereRaw('LOWER(short_name) = ?', [$productShort])
                    ->first();

                if ($product) {
                    $resolvedRate = $client
                        ? $priceService->resolveUnitPrice($orgId, $client->id, $product->id)
                        : $product->base_price;

                    $items[] = [
                        'product_id'   => $product->id,
                        'name'         => $product->name,
                        'hsn_code'     => $product->hsn_code,
                        'unit'         => $product->unit,
                        'quantity'     => $quantity,
                        'rate'         => $resolvedRate,
                        'gst_rate'     => $product->default_gst_rate,
                    ];
                } else {
                    $unmatched[] = $line;
                }
            } else {
                $unmatched[] = $line;
            }
        }

        return response()->json([
            'client'    => $client,
            'items'     => $items,
            'unmatched' => $unmatched,
        ]);
    }
}