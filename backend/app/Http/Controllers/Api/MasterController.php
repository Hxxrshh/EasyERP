<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Product;
use App\Services\PriceIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MasterController extends Controller
{
    public function getMeta(Request $request): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $user = $request->user();

        return response()->json([
            'organizations' => $user->organizations,
            'clients'       => Client::where('organization_id', $orgId)->get(),
            'products'      => Product::where('organization_id', $orgId)->get(),
        ]);
    }

    public function resolvePrice(Request $request, PriceIntelligenceService $priceService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');

        $request->validate([
            'client_id'  => 'required|integer',
            'product_id' => 'required|integer',
        ]);

        $client = Client::where('id', $request->client_id)
            ->where('organization_id', $orgId)
            ->first();

        $product = Product::where('id', $request->product_id)
            ->where('organization_id', $orgId)
            ->first();

        if (!$client || !$product) {
            return response()->json(['message' => 'Unauthorized or entity not found in this organization.'], 403);
        }

        $rate = $priceService->resolveUnitPrice(
            $orgId,
            $client->id,
            $product->id
        );

        return response()->json(['resolved_rate' => $rate]);
    }
}