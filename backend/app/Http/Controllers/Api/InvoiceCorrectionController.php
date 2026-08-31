<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InvoiceCorrection;
use App\Services\InvoiceCorrectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class InvoiceCorrectionController extends Controller
{
    public function __construct(
        protected InvoiceCorrectionService $correctionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $orgId = (int) $request->attributes->get('active_organization_id');
        $corrections = InvoiceCorrection::where('organization_id', $orgId)
            ->with(['invoice', 'requester', 'approver', 'applier'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($corrections);
    }

    public function requestCorrection(int $id, Request $request): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditor role is read-only.'], 403);
        }

        $validated = $request->validate([
            'reason'              => 'required|string|max:1000',
            'items'               => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity'   => 'required|numeric|gt:0',
            'items.*.rate'       => 'required|numeric|gte:0',
            'items.*.gst_rate'   => 'nullable|numeric|gte:0',
        ]);

        $orgId = (int) $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        try {
            $correction = $this->correctionService->requestCorrection(
                $orgId,
                $userId,
                $id,
                $validated['items'],
                $validated['reason']
            );

            return response()->json($correction, 201);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function approve(int $id, Request $request): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Only Organization Administrators can approve invoice corrections.'], 403);
        }

        $orgId = (int) $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        try {
            $correction = $this->correctionService->approveCorrection($orgId, $userId, $id);
            return response()->json($correction);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function apply(int $id, Request $request): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Only Organization Administrators can apply invoice corrections.'], 403);
        }

        $orgId = (int) $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        try {
            $correction = $this->correctionService->applyCorrection($orgId, $userId, $id);
            return response()->json($correction);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function reject(int $id, Request $request): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role !== 'admin') {
            return response()->json(['message' => 'Only Organization Administrators can reject invoice corrections.'], 403);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $orgId = (int) $request->attributes->get('active_organization_id');
        $userId = $request->user()->id;

        try {
            $correction = $this->correctionService->rejectCorrection(
                $orgId,
                $userId,
                $id,
                $validated['rejection_reason']
            );

            return response()->json($correction);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
