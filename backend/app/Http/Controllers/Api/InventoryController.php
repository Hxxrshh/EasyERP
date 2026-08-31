<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function summary(Request $request, InventoryService $inventoryService): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $overview = $inventoryService->getInventoryOverview($orgId);

        return response()->json($overview);
    }

    public function recordTransaction(Request $request, InventoryService $inventoryService, AuditLogService $auditService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditor role is read-only. Inventory modifications are restricted.'], 403);
        }

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity'   => 'required|numeric|not_in:0',
            'type'       => 'required|string|in:opening_stock,stock_in,stock_out,adjustment',
            'reference'  => 'nullable|string|max:100',
            'notes'      => 'nullable|string',
        ]);

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;

        $txn = $inventoryService->recordTransaction(
            $orgId,
            (int) $validated['product_id'],
            (float) $validated['quantity'],
            $validated['type'],
            $validated['reference'] ?? null,
            $validated['notes'] ?? null,
            $userId
        );

        $auditService->log(
            $orgId,
            $userId,
            'inventory_transaction_recorded',
            $txn,
            $txn->id,
            null,
            $txn->toArray()
        );

        return response()->json($txn->load('product'), 201);
    }
}
