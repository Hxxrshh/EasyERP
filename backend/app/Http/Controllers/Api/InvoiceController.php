<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceRequest;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\ClientProductPrice;
use App\Models\Organization;
use App\Models\Product;
use App\Services\AuditLogService;
use App\Services\GstCalculatorService;
use App\Services\InventoryService;
use App\Services\InvoiceLockService;
use App\Services\InvoiceSequenceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $role = $request->attributes->get('active_role');

        $query = Invoice::with(['client', 'items.product'])
            ->where('organization_id', $orgId);

        if ($role === 'auditor') {
            $query->where('status', '!=', 'draft');
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($type = $request->query('document_type')) {
            $query->where('document_type', $type);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($taxMode = $request->query('tax_mode')) {
            $query->where('tax_mode', $taxMode);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('date', '<=', $to);
        }

        if ($fy = $request->query('financial_year')) {
            // Financial year format FY26-27 or 2026-2027
            $parts = explode('-', str_replace('FY', '', $fy));
            if (count($parts) === 2) {
                $startYear = strlen($parts[0]) === 2 ? ('20' . $parts[0]) : $parts[0];
                $endYear = strlen($parts[1]) === 2 ? ('20' . $parts[1]) : $parts[1];
                $query->whereDate('date', '>=', "{$startYear}-04-01")
                      ->whereDate('date', '<=', "{$endYear}-03-31");
            }
        }

        if ($payStatus = $request->query('payment_status')) {
            if ($payStatus === 'unpaid') {
                $query->where('paid_amount', '<=', 0);
            } elseif ($payStatus === 'partially_paid') {
                $query->whereRaw('paid_amount > 0 AND paid_amount < total_amount');
            } elseif ($payStatus === 'paid') {
                $query->whereRaw('paid_amount >= total_amount');
            }
        }

        if ($request->boolean('is_overdue')) {
            $today = Carbon::today()->toDateString();
            $query->where('status', 'finalized')
                  ->whereRaw('paid_amount < total_amount')
                  ->whereDate('due_date', '<', $today);
        }

        // Clone query for calculating authoritative summary metrics across matched set
        $summaryQuery = clone $query;
        $allMatched = $summaryQuery->get();
        $totalAmountSum = (float) $allMatched->sum('total_amount');
        $paidAmountSum = (float) $allMatched->sum('paid_amount');
        $outstandingAmountSum = round(max(0, $totalAmountSum - $paidAmountSum), 2);

        $today = Carbon::today();
        $overdueAmountSum = 0.0;
        foreach ($allMatched as $inv) {
            if ($inv->status === 'finalized' && ($inv->total_amount - $inv->paid_amount) > 0.001) {
                $dueDate = $inv->due_date ? Carbon::parse($inv->due_date) : Carbon::parse($inv->date)->addDays(30);
                if ($today->gt($dueDate)) {
                    $overdueAmountSum += ($inv->total_amount - $inv->paid_amount);
                }
            }
        }

        $paginated = $query->latest()->paginate(20);
        $customResponse = array_merge($paginated->toArray(), [
            'summary' => [
                'total_amount_sum'       => round($totalAmountSum, 2),
                'paid_amount_sum'        => round($paidAmountSum, 2),
                'outstanding_amount_sum' => round($outstandingAmountSum, 2),
                'overdue_amount_sum'     => round($overdueAmountSum, 2),
            ],
        ]);

        return response()->json($customResponse);
    }

    public function store(StoreInvoiceRequest $request, GstCalculatorService $gstService, AuditLogService $auditService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditors are not permitted to create invoices.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;
        $organization = Organization::findOrFail($orgId);

        $validated = $request->validated();

        $client = Client::where('id', $validated['client_id'])
            ->where('organization_id', $orgId)
            ->first();

        if (!$client) {
            return response()->json(['message' => 'Client does not belong to this organization.'], 403);
        }

        foreach ($validated['items'] as $item) {
            $productExists = Product::where('id', $item['product_id'])
                ->where('organization_id', $orgId)
                ->exists();

            if (!$productExists) {
                return response()->json(['message' => 'Product does not belong to this organization.'], 403);
            }
        }

        $taxMode = $validated['tax_mode'] ?? 'taxable';
        $calcResult = $gstService->calculate($organization, $client, $validated['items'], $taxMode);
        $dueDate = Carbon::parse($validated['date'])
            ->addDays($client->default_due_days)
            ->format('Y-m-d');

        $invoice = DB::transaction(function () use ($validated, $orgId, $userId, $dueDate, $taxMode, $calcResult, $auditService) {
            $invoice = Invoice::create([
                'organization_id' => $orgId,
                'client_id'       => $validated['client_id'],
                'document_type'   => $validated['document_type'],
                'tax_mode'        => $taxMode,
                'date'            => $validated['date'],
                'due_date'        => $dueDate,
                'subtotal'        => $calcResult['subtotal'],
                'cgst_total'      => $calcResult['cgst_total'],
                'sgst_total'      => $calcResult['sgst_total'],
                'igst_total'      => $calcResult['igst_total'],
                'total_gst'       => $calcResult['total_gst'],
                'total_amount'    => $calcResult['grand_total'],
                'status'          => 'draft',
                'template_key'    => $validated['template_key'] ?? 'classic_gst',
                'invoice_number'  => null,
            ]);

            foreach ($calcResult['items'] as $itemData) {
                $itemData['invoice_id'] = $invoice->id;
                InvoiceItem::create($itemData);
            }

            $auditService->log(
                $orgId,
                $userId,
                'document_created',
                $invoice,
                $invoice->id,
                null,
                $invoice->toArray()
            );

            return $invoice->load(['client', 'items.product']);
        });

        return response()->json($invoice, 201);
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $orgId = $request->attributes->get('active_organization_id');
        $role = $request->attributes->get('active_role');

        $query = Invoice::with(['client', 'items.product', 'organization'])
            ->where('organization_id', $orgId);

        if ($role === 'auditor') {
            $query->where('status', '!=', 'draft');
        }

        $invoice = $query->find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found.'], 404);
        }

        return response()->json($invoice);
    }

    public function update(int $id, StoreInvoiceRequest $request, GstCalculatorService $gstService, InvoiceLockService $lockService, AuditLogService $auditService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditors are not permitted to update invoices.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;
        $organization = Organization::findOrFail($orgId);

        $invoice = Invoice::where('organization_id', $orgId)->find($id);
        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found.'], 404);
        }

        if ($invoice->status === 'finalized') {
            return response()->json(['message' => 'Finalized invoices are immutable and cannot be updated.'], 403);
        }

        if ($invoice->status === 'cancelled') {
            return response()->json(['message' => 'Cancelled documents cannot be updated.'], 422);
        }

        if ($lockService->isLocked($invoice)) {
            return response()->json(['message' => 'This invoice is locked for audit integrity and cannot be updated.'], 403);
        }

        $validated = $request->validated();

        $client = Client::where('id', $validated['client_id'])
            ->where('organization_id', $orgId)
            ->first();

        if (!$client) {
            return response()->json(['message' => 'Client does not belong to this organization.'], 403);
        }

        foreach ($validated['items'] as $item) {
            $productExists = Product::where('id', $item['product_id'])
                ->where('organization_id', $orgId)
                ->exists();

            if (!$productExists) {
                return response()->json(['message' => 'Product does not belong to this organization.'], 403);
            }
        }

        $taxMode = $validated['tax_mode'] ?? $invoice->tax_mode ?? 'taxable';
        $calcResult = $gstService->calculate($organization, $client, $validated['items'], $taxMode);
        $dueDate = Carbon::parse($validated['date'])
            ->addDays($client->default_due_days)
            ->format('Y-m-d');

        $beforeData = $invoice->toArray();

        DB::transaction(function () use ($invoice, $validated, $orgId, $userId, $dueDate, $taxMode, $calcResult, $beforeData, $auditService) {
            $invoice->update([
                'client_id'     => $validated['client_id'],
                'document_type' => $validated['document_type'],
                'tax_mode'      => $taxMode,
                'date'          => $validated['date'],
                'due_date'      => $dueDate,
                'subtotal'      => $calcResult['subtotal'],
                'cgst_total'    => $calcResult['cgst_total'],
                'sgst_total'    => $calcResult['sgst_total'],
                'igst_total'    => $calcResult['igst_total'],
                'total_gst'     => $calcResult['total_gst'],
                'total_amount'  => $calcResult['grand_total'],
                'template_key'  => $validated['template_key'] ?? 'classic_gst',
            ]);

            $invoice->items()->delete();
            foreach ($calcResult['items'] as $itemData) {
                $itemData['invoice_id'] = $invoice->id;
                InvoiceItem::create($itemData);
            }

            $auditService->log(
                $orgId,
                $userId,
                'document_updated',
                $invoice,
                $invoice->id,
                $beforeData,
                $invoice->fresh()->toArray()
            );
        });

        return response()->json($invoice->fresh(['client', 'items.product']));
    }

    public function finalize(
        int $id,
        Request $request,
        InvoiceSequenceService $sequenceService,
        GstCalculatorService $gstService,
        AuditLogService $auditService,
        InventoryService $inventoryService
    ): JsonResponse {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditors are not permitted to finalize invoices.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;
        $organization = Organization::findOrFail($orgId);

        $invoice = Invoice::with('items')
            ->where('organization_id', $orgId)
            ->find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found.'], 404);
        }

        if ($invoice->status === 'finalized') {
            return response()->json(['message' => 'Invoice is already finalized.'], 400);
        }

        if ($invoice->status === 'cancelled') {
            return response()->json(['message' => 'Cancelled documents cannot be finalized.'], 422);
        }

        $beforeData = $invoice->toArray();

        DB::transaction(function () use ($invoice, $organization, $orgId, $userId, $sequenceService, $gstService, $beforeData, $auditService, $inventoryService) {
            $client = Client::where('id', $invoice->client_id)
                ->where('organization_id', $organization->id)
                ->firstOrFail();

            $itemsPayload = $invoice->items->map(function ($item) {
                return [
                    'product_id' => $item->product_id,
                    'quantity'   => $item->quantity,
                    'rate'       => $item->rate,
                    'gst_rate'   => $item->gst_rate,
                ];
            })->toArray();

            $taxMode = $invoice->tax_mode ?? 'taxable';
            $calcResult = $gstService->calculate($organization, $client, $itemsPayload, $taxMode);

            $invoiceNumber = $sequenceService->generateNextNumber(
                $organization->id,
                $invoice->date->format('Y-m-d')
            );

            $invoice->items()->delete();
            foreach ($calcResult['items'] as $itemData) {
                $itemData['invoice_id'] = $invoice->id;
                InvoiceItem::create($itemData);
            }

            $invoice->update([
                'status'         => 'finalized',
                'invoice_number' => $invoiceNumber,
                'finalized_at'   => Carbon::now(),
                'subtotal'       => $calcResult['subtotal'],
                'cgst_total'     => $calcResult['cgst_total'],
                'sgst_total'     => $calcResult['sgst_total'],
                'igst_total'     => $calcResult['igst_total'],
                'total_gst'      => $calcResult['total_gst'],
                'total_amount'   => $calcResult['grand_total'],
            ]);

            foreach ($calcResult['items'] as $itemData) {
                ClientProductPrice::updateOrCreate(
                    [
                        'client_id'  => $invoice->client_id,
                        'product_id' => $itemData['product_id'],
                    ],
                    [
                        'last_price' => $itemData['rate'],
                    ]
                );
            }

            // Deduct physical inventory stock for finalized invoices & delivery challans
            $inventoryService->handleInvoiceFinalization($invoice->fresh(), $userId);

            $auditService->log(
                $orgId,
                $userId,
                'invoice_finalized',
                $invoice,
                $invoice->id,
                $beforeData,
                $invoice->fresh()->toArray()
            );
        });

        return response()->json($invoice->fresh(['client', 'items.product']));
    }

    public function convert(int $id, Request $request, GstCalculatorService $gstService, AuditLogService $auditService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditors are not permitted to convert documents.'], 403);
        }

        $request->validate([
            'target_type' => 'required|in:proforma,challan,invoice',
        ]);

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;
        $organization = Organization::findOrFail($orgId);

        $sourceDoc = Invoice::with('items')->where('organization_id', $orgId)->find($id);
        if (!$sourceDoc) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        if ($sourceDoc->status === 'cancelled') {
            return response()->json(['message' => 'Cancelled documents cannot be converted.'], 422);
        }

        $sourceType = $sourceDoc->document_type;
        $targetType = $request->target_type;

        // Transition Rules Validation:
        // quote -> proforma, challan, invoice
        // proforma -> invoice
        // challan -> invoice
        $validTransition = false;
        if ($sourceType === 'quote' && in_array($targetType, ['proforma', 'challan', 'invoice'])) {
            $validTransition = true;
        } elseif ($sourceType === 'proforma' && $targetType === 'invoice') {
            $validTransition = true;
        } elseif ($sourceType === 'challan' && $targetType === 'invoice') {
            $validTransition = true;
        }

        if (!$validTransition) {
            return response()->json(['message' => "Invalid document conversion from {$sourceType} to {$targetType}."], 422);
        }

        $client = Client::where('id', $sourceDoc->client_id)->where('organization_id', $orgId)->firstOrFail();

        $itemsPayload = $sourceDoc->items->map(function ($item) {
            return [
                'product_id' => $item->product_id,
                'quantity'   => $item->quantity,
                'rate'       => $item->rate,
                'gst_rate'   => $item->gst_rate,
            ];
        })->toArray();

        $taxMode = $sourceDoc->tax_mode ?? 'taxable';
        $calcResult = $gstService->calculate($organization, $client, $itemsPayload, $taxMode);
        $dueDate = Carbon::now()->addDays($client->default_due_days)->format('Y-m-d');

        $newDoc = DB::transaction(function () use ($orgId, $userId, $sourceDoc, $targetType, $dueDate, $taxMode, $calcResult, $auditService) {
            $newDoc = Invoice::create([
                'organization_id' => $orgId,
                'client_id'       => $sourceDoc->client_id,
                'document_type'   => $targetType,
                'tax_mode'        => $taxMode,
                'date'            => now()->format('Y-m-d'),
                'due_date'        => $dueDate,
                'subtotal'        => $calcResult['subtotal'],
                'cgst_total'      => $calcResult['cgst_total'],
                'sgst_total'      => $calcResult['sgst_total'],
                'igst_total'      => $calcResult['igst_total'],
                'total_gst'       => $calcResult['total_gst'],
                'total_amount'    => $calcResult['grand_total'],
                'status'          => 'draft',
                'template_key'    => $sourceDoc->template_key,
                'invoice_number'  => null,
            ]);

            foreach ($calcResult['items'] as $itemData) {
                $itemData['invoice_id'] = $newDoc->id;
                InvoiceItem::create($itemData);
            }

            $auditService->log(
                $orgId,
                $userId,
                'document_converted',
                $newDoc,
                $newDoc->id,
                ['source_document_id' => $sourceDoc->id, 'source_type' => $sourceDoc->document_type],
                ['converted_document_id' => $newDoc->id, 'target_type' => $newDoc->document_type]
            );

            return $newDoc->load(['client', 'items.product']);
        });

        return response()->json($newDoc, 201);
    }

    public function cancel(int $id, Request $request, AuditLogService $auditService, InventoryService $inventoryService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditors are not permitted to cancel documents.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $userId = $request->user()?->id;

        $invoice = Invoice::where('organization_id', $orgId)->find($id);
        if (!$invoice) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        if ($invoice->status === 'cancelled') {
            return response()->json(['message' => 'Document is already cancelled.'], 400);
        }

        $beforeData = $invoice->toArray();

        DB::transaction(function () use ($invoice, $orgId, $userId, $beforeData, $auditService, $inventoryService) {
            $invoice->update(['status' => 'cancelled']);

            // Restore physical inventory stock if a finalized document is cancelled
            $inventoryService->handleInvoiceCancellation($invoice, $userId);

            $auditService->log(
                $orgId,
                $userId,
                'document_cancelled',
                $invoice,
                $invoice->id,
                $beforeData,
                $invoice->fresh()->toArray()
            );
        });

        return response()->json($invoice->fresh());
    }

    public function destroy(int $id, Request $request, InvoiceLockService $lockService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditors are not permitted to delete invoices.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $invoice = Invoice::where('organization_id', $orgId)->find($id);

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found.'], 404);
        }

        if ($invoice->status === 'finalized') {
            return response()->json([
                'message' => 'Finalized invoices are immutable for accounting integrity and cannot be deleted.'
            ], 403);
        }

        if ($lockService->isLocked($invoice)) {
            return response()->json([
                'message' => 'This invoice is locked for audit integrity and cannot be deleted.'
            ], 403);
        }

        $invoice->delete();
        return response()->json(['message' => 'Invoice deleted successfully.']);
    }
}