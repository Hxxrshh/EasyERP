<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\CustomerAccountingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerAccountingController extends Controller
{
    public function getClientSummary(int $id, Request $request, CustomerAccountingService $accountingService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $client = Client::where('organization_id', $orgId)->find($id);

        if (!$client) {
            return response()->json(['message' => 'Client not found or unauthorized.'], 404);
        }

        $summary = $accountingService->getCustomerSummary($client);
        return response()->json($summary);
    }

    public function getDashboardOverview(Request $request, CustomerAccountingService $accountingService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $overview = $accountingService->getDashboardOverview($orgId);

        return response()->json($overview);
    }
}
