<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceCorrection;
use App\Models\InvoiceItem;
use App\Models\Organization;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InvoiceCorrectionService
{
    public function __construct(
        protected GstCalculatorService $gstCalculator,
        protected InventoryService $inventoryService,
        protected AuditLogService $auditService
    ) {}

    public function requestCorrection(int $orgId, int $userId, int $invoiceId, array $proposedItems, string $reason): InvoiceCorrection
    {
        $invoice = Invoice::where('organization_id', $orgId)->with(['client', 'items.product'])->find($invoiceId);
        if (!$invoice) {
            throw new InvalidArgumentException('Invoice not found or unauthorized.');
        }

        if ($invoice->status !== 'finalized') {
            throw new InvalidArgumentException('Only finalized invoices can undergo formal historical correction.');
        }

        if (empty($proposedItems)) {
            throw new InvalidArgumentException('Proposed correction items cannot be empty.');
        }

        $org = Organization::findOrFail($orgId);

        // Build Original Snapshot
        $originalSnapshot = [
            'invoice_number' => $invoice->invoice_number,
            'subtotal'       => (float) $invoice->subtotal,
            'cgst_total'     => (float) $invoice->cgst_total,
            'sgst_total'     => (float) $invoice->sgst_total,
            'igst_total'     => (float) $invoice->igst_total,
            'total_gst'      => (float) $invoice->total_gst,
            'total_amount'   => (float) $invoice->total_amount,
            'paid_amount'    => (float) $invoice->paid_amount,
            'tax_mode'       => $invoice->tax_mode,
            'template_key'   => $invoice->template_key,
            'items'          => $invoice->items->map(fn($item) => [
                'product_id' => $item->product_id,
                'name'       => $item->product?->name ?? 'Product',
                'quantity'   => (float) $item->quantity,
                'rate'       => (float) $item->rate,
                'gst_rate'   => (float) $item->gst_rate,
                'amount'     => (float) $item->amount,
            ])->toArray(),
        ];

        // Build Proposed Snapshot using GstCalculatorService
        $calcRes = $this->gstCalculator->calculate($org, $invoice->client, $proposedItems, $invoice->tax_mode);

        $proposedLineItems = [];
        foreach ($calcRes['items'] as $itemData) {
            $product = Product::where('organization_id', $orgId)->find($itemData['product_id']);
            $proposedLineItems[] = [
                'product_id'     => $itemData['product_id'],
                'name'           => $product?->name ?? 'Product',
                'quantity'       => $itemData['quantity'],
                'rate'           => $itemData['rate'],
                'gst_rate'       => $itemData['gst_rate'],
                'taxable_amount' => $itemData['taxable_amount'],
                'cgst_amount'    => $itemData['cgst_amount'],
                'sgst_amount'    => $itemData['sgst_amount'],
                'igst_amount'    => $itemData['igst_amount'],
                'amount'         => $itemData['amount'],
            ];
        }

        $proposedSnapshot = [
            'subtotal'     => $calcRes['subtotal'],
            'cgst_total'   => $calcRes['cgst_total'],
            'sgst_total'   => $calcRes['sgst_total'],
            'igst_total'   => $calcRes['igst_total'],
            'total_gst'    => $calcRes['total_gst'],
            'total_amount' => $calcRes['grand_total'],
            'items'        => $proposedLineItems,
        ];

        $ref = 'CORR-' . date('Ymd') . '-' . sprintf('%04d', rand(1, 9999));

        $correction = InvoiceCorrection::create([
            'organization_id'      => $orgId,
            'invoice_id'           => $invoiceId,
            'correction_reference' => $ref,
            'requested_by'         => $userId,
            'reason'               => $reason,
            'status'               => 'requested',
            'original_snapshot'    => $originalSnapshot,
            'proposed_snapshot'    => $proposedSnapshot,
        ]);

        $this->auditService->log(
            $orgId,
            $userId,
            'invoice_correction_requested',
            $correction,
            $correction->id,
            null,
            $correction->toArray()
        );

        return $correction;
    }

    public function approveCorrection(int $orgId, int $adminUserId, int $correctionId): InvoiceCorrection
    {
        $correction = InvoiceCorrection::where('organization_id', $orgId)->find($correctionId);
        if (!$correction) {
            throw new InvalidArgumentException('Correction record not found.');
        }

        if ($correction->requested_by === $adminUserId) {
            throw new InvalidArgumentException('Operator / Requester self-approval is forbidden. An independent Administrator must approve corrections.');
        }

        if ($correction->status !== 'requested') {
            throw new InvalidArgumentException("Correction cannot be approved from current state '{$correction->status}'.");
        }

        $correction->update([
            'status'      => 'approved',
            'approved_by' => $adminUserId,
        ]);

        $this->auditService->log(
            $orgId,
            $adminUserId,
            'invoice_correction_approved',
            $correction,
            $correction->id,
            null,
            $correction->fresh()->toArray()
        );

        return $correction->fresh();
    }

    public function applyCorrection(int $orgId, int $adminUserId, int $correctionId): InvoiceCorrection
    {
        return DB::transaction(function () use ($orgId, $adminUserId, $correctionId) {
            $correction = InvoiceCorrection::where('organization_id', $orgId)
                ->lockForUpdate()
                ->find($correctionId);

            if (!$correction) {
                throw new InvalidArgumentException('Correction record not found.');
            }

            if (in_array($correction->status, ['applied', 'rejected'])) {
                throw new InvalidArgumentException("Correction has already been finalized as '{$correction->status}'. Concurrent double-application prevented.");
            }

            if ($correction->requested_by === $adminUserId) {
                throw new InvalidArgumentException('Requester self-application is forbidden for accounting security.');
            }

            $invoice = Invoice::where('organization_id', $orgId)->lockForUpdate()->find($correction->invoice_id);
            if (!$invoice) {
                throw new InvalidArgumentException('Target invoice not found.');
            }

            $prop = $correction->proposed_snapshot;
            $orig = $correction->original_snapshot;

            // 1. Inventory Stock Adjustment
            $origQtyMap = [];
            foreach ($orig['items'] as $oi) {
                $origQtyMap[$oi['product_id']] = ($origQtyMap[$oi['product_id']] ?? 0) + (float) $oi['quantity'];
            }

            $propQtyMap = [];
            foreach ($prop['items'] as $pi) {
                $propQtyMap[$pi['product_id']] = ($propQtyMap[$pi['product_id']] ?? 0) + (float) $pi['quantity'];
            }

            $allProdIds = array_unique(array_merge(array_keys($origQtyMap), array_keys($propQtyMap)));
            foreach ($allProdIds as $pId) {
                $oldQ = $origQtyMap[$pId] ?? 0.0;
                $newQ = $propQtyMap[$pId] ?? 0.0;
                $diff = $oldQ - $newQ; // If old was 100 and new is 80, diff = +20 stock restored to inventory

                if (abs($diff) > 0.0001) {
                    $type = $diff > 0 ? 'adjustment' : 'stock_out';
                    $qty = abs($diff);
                    $this->inventoryService->recordTransaction(
                        $orgId,
                        $pId,
                        $qty,
                        $type,
                        $correction->correction_reference,
                        "Stock adjustment via historical invoice correction #{$invoice->invoice_number}",
                        $adminUserId
                    );
                }
            }

            // 2. Update Invoice Line Items
            InvoiceItem::where('invoice_id', $invoice->id)->delete();
            foreach ($prop['items'] as $itemData) {
                InvoiceItem::create([
                    'invoice_id'     => $invoice->id,
                    'product_id'     => $itemData['product_id'],
                    'quantity'       => $itemData['quantity'],
                    'rate'           => $itemData['rate'],
                    'gst_rate'       => $itemData['gst_rate'],
                    'taxable_amount' => $itemData['taxable_amount'] ?? ($itemData['quantity'] * $itemData['rate']),
                    'cgst_amount'    => $itemData['cgst_amount'] ?? 0,
                    'sgst_amount'    => $itemData['sgst_amount'] ?? 0,
                    'igst_amount'    => $itemData['igst_amount'] ?? 0,
                    'amount'         => $itemData['amount'],
                ]);
            }

            // 3. Recalculate Invoice Totals & Handle Payment Allocation Adjustments
            $newTotalAmount = (float) $prop['total_amount'];
            $currentPaidAmount = (float) $invoice->paid_amount;
            $overpaidCredit = 0.0;

            if ($currentPaidAmount > $newTotalAmount) {
                // Total invoice amount decreased below paid amount -> adjust allocations
                $excessPaid = round($currentPaidAmount - $newTotalAmount, 2);

                // Fetch allocations in reverse chronological order
                $allocations = DB::table('payment_invoice_map')
                    ->where('invoice_id', $invoice->id)
                    ->orderBy('id', 'desc')
                    ->get();

                $toReduce = $excessPaid;
                foreach ($allocations as $alloc) {
                    if ($toReduce <= 0) break;

                    $applied = (float) $alloc->amount_applied;
                    $reduction = min($applied, $toReduce);

                    if ($reduction >= $applied) {
                        DB::table('payment_invoice_map')->where('id', $alloc->id)->delete();
                    } else {
                        DB::table('payment_invoice_map')->where('id', $alloc->id)->decrement('amount_applied', $reduction);
                    }

                    // Restore unallocated_amount on payment record
                    DB::table('payments')->where('id', $alloc->payment_id)->increment('unallocated_amount', $reduction);
                    $toReduce = round($toReduce - $reduction, 2);
                }

                $invoice->update([
                    'subtotal'     => $prop['subtotal'],
                    'cgst_total'   => $prop['cgst_total'],
                    'sgst_total'   => $prop['sgst_total'],
                    'igst_total'   => $prop['igst_total'],
                    'total_gst'    => $prop['total_gst'],
                    'total_amount' => $prop['total_amount'],
                    'paid_amount'  => $newTotalAmount,
                ]);
            } else {
                $invoice->update([
                    'subtotal'     => $prop['subtotal'],
                    'cgst_total'   => $prop['cgst_total'],
                    'sgst_total'   => $prop['sgst_total'],
                    'igst_total'   => $prop['igst_total'],
                    'total_gst'    => $prop['total_gst'],
                    'total_amount' => $prop['total_amount'],
                ]);
            }

            // 4. Update Correction Record Status
            $correction->update([
                'status'           => 'applied',
                'approved_by'      => $correction->approved_by ?: $adminUserId,
                'applied_by'       => $adminUserId,
                'applied_snapshot' => $prop,
                'applied_at'       => now(),
            ]);

            $this->auditService->log(
                $orgId,
                $adminUserId,
                'invoice_correction_applied',
                $correction,
                $correction->id,
                $orig,
                $prop
            );

            return $correction->fresh();
        });
    }

    public function rejectCorrection(int $orgId, int $adminUserId, int $correctionId, string $rejectionReason): InvoiceCorrection
    {
        $correction = InvoiceCorrection::where('organization_id', $orgId)->find($correctionId);
        if (!$correction) {
            throw new InvalidArgumentException('Correction record not found.');
        }

        if (in_array($correction->status, ['applied', 'rejected'])) {
            throw new InvalidArgumentException("Correction is already {$correction->status}.");
        }

        $correction->update([
            'status'           => 'rejected',
            'approved_by'      => $adminUserId,
            'rejection_reason' => $rejectionReason,
        ]);

        $this->auditService->log(
            $orgId,
            $adminUserId,
            'invoice_correction_rejected',
            $correction,
            $correction->id,
            null,
            $correction->fresh()->toArray()
        );

        return $correction->fresh();
    }
}
