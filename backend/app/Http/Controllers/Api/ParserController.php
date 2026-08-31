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
            return response()->json(['message' => 'Text payload is empty. Please paste raw WhatsApp order text.'], 422);
        }

        $orgId = (int) $request->attributes->get('active_organization_id');

        // Line 1: Match Client by short_name, name, or company_name
        $clientInput = trim($lines[0]);
        $clientInputLower = strtolower($clientInput);

        $client = Client::where('organization_id', $orgId)
            ->where(function ($q) use ($clientInputLower) {
                $q->whereRaw('LOWER(short_name) = ?', [$clientInputLower])
                  ->orWhereRaw('LOWER(name) = ?', [$clientInputLower])
                  ->orWhereRaw('LOWER(name) LIKE ?', ["%{$clientInputLower}%"]);
            })
            ->first();

        $clientError = null;
        if (!$client) {
            $clientError = "Unknown customer: '{$clientInput}'. Please select customer manually or register customer short code.";
        }

        $items = [];
        $unmatched = [];

        // Lines 2..N: Match Items & Quantities
        for ($i = 1; $i < count($lines); $i++) {
            $line = $lines[$i];
            if (preg_match('/^(.*?)\s+(\d+(\.\d+)?)$/', $line, $matches)) {
                $productQuery = strtolower(trim($matches[1]));
                $quantity = (float) $matches[2];

                $product = Product::where('organization_id', $orgId)
                    ->where(function ($q) use ($productQuery) {
                        $q->whereRaw('LOWER(short_name) = ?', [$productQuery])
                          ->orWhereRaw('LOWER(name) = ?', [$productQuery])
                          ->orWhereRaw('LOWER(name) LIKE ?', ["%{$productQuery}%"])
                          ->orWhereRaw('LOWER(hsn_code) = ?', [$productQuery]);
                    })
                    ->first();

                if ($product) {
                    $resolvedRate = $client
                        ? $priceService->resolveUnitPrice($orgId, $client->id, $product->id)
                        : (float) $product->base_price;

                    $items[] = [
                        'product_id'   => $product->id,
                        'name'         => $product->name,
                        'hsn_code'     => $product->hsn_code,
                        'unit'         => $product->unit,
                        'quantity'     => $quantity,
                        'rate'         => $resolvedRate,
                        'gst_rate'     => (float) $product->default_gst_rate,
                    ];
                } else {
                    $unmatched[] = [
                        'line'   => $line,
                        'reason' => "Product '{$productQuery}' not found in catalog.",
                    ];
                }
            } else {
                $unmatched[] = [
                    'line'   => $line,
                    'reason' => "Malformed line syntax. Expected 'ProductCode Quantity' (e.g. hdpe 50).",
                ];
            }
        }

        return response()->json([
            'client'       => $client,
            'client_error' => $clientError,
            'items'        => $items,
            'unmatched'    => $unmatched,
        ]);
    }
}