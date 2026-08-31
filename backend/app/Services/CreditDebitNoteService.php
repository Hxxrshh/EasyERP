<?php

namespace App\Services;

use App\Models\CreditDebitNote;
use App\Models\CreditDebitNoteItem;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreditDebitNoteService
{
    public function __construct(
        protected GstCalculatorService $gstCalculator,
        protected InventoryService $inventoryService,
        protected AuditLogService $auditService
    ) {}

    public function createNote(
        int $orgId,
        int $userId,
        int $invoiceId,
        string $noteType,
        string $reason,
        array $items,
        ?string $dateString = null
    ): CreditDebitNote {
        if (!in_array($noteType, ['credit_note', 'debit_note'])) {
            throw new InvalidArgumentException("Invalid note type '{$noteType}'.");
        }

        $invoice = Invoice::where('organization_id', $orgId)->with('client')->find($invoiceId);
        if (!$invoice) {
            throw new InvalidArgumentException('Invoice not found or unauthorized.');
        }

        if ($invoice->status !== 'finalized') {
            throw new InvalidArgumentException('Credit / Debit Notes can only be issued against finalized invoices.');
        }

        if (empty($items)) {
            throw new InvalidArgumentException('Note items cannot be empty.');
        }

        $org = Organization::findOrFail($orgId);
        $date = $dateString ?: Carbon::today()->toDateString();

        return DB::transaction(function () use ($org, $orgId, $userId, $invoice, $noteType, $reason, $items, $date) {
            // Generate sequence number
            $seqPrefix = ($noteType === 'credit_note') ? 'CN' : 'DN';
            $fyDate = Carbon::parse($date);
            $year = $fyDate->year;
            $fyStart = $fyDate->month >= 4 ? $year : $year - 1;
            $fyEnd = $fyStart + 1;
            $fyStr = sprintf('%02d-%02d', $fyStart % 100, $fyEnd % 100);

            $count = CreditDebitNote::where('organization_id', $orgId)
                ->where('note_type', $noteType)
                ->count();
            $noteNumber = sprintf('%s-%03d/%s', $seqPrefix, $count + 1, $fyStr);

            // Calculate GST
            $calcRes = $this->gstCalculator->calculate($org, $invoice->client, $items, $invoice->tax_mode);

            $note = CreditDebitNote::create([
                'organization_id' => $orgId,
                'client_id'       => $invoice->client_id,
                'invoice_id'      => $invoice->id,
                'note_type'       => $noteType,
                'note_number'     => $noteNumber,
                'date'            => $date,
                'reason'          => $reason,
                'subtotal'        => $calcRes['subtotal'],
                'cgst_total'      => $calcRes['cgst_total'],
                'sgst_total'      => $calcRes['sgst_total'],
                'igst_total'      => $calcRes['igst_total'],
                'total_gst'       => $calcRes['total_gst'],
                'total_amount'    => $calcRes['grand_total'],
                'status'          => 'finalized',
                'created_by'      => $userId,
            ]);

            foreach ($calcRes['items'] as $itemData) {
                CreditDebitNoteItem::create([
                    'note_id'        => $note->id,
                    'product_id'     => $itemData['product_id'],
                    'quantity'       => $itemData['quantity'],
                    'rate'           => $itemData['rate'],
                    'gst_rate'       => $itemData['gst_rate'],
                    'taxable_amount' => $itemData['taxable_amount'],
                    'cgst_amount'    => $itemData['cgst_amount'],
                    'sgst_amount'    => $itemData['sgst_amount'],
                    'igst_amount'    => $itemData['igst_amount'],
                    'amount'         => $itemData['amount'],
                ]);

                // Inventory adjustment: Credit Note restores stock (stock_in), Debit Note deducts stock (stock_out)
                $txnType = ($noteType === 'credit_note') ? 'adjustment' : 'stock_out';
                $this->inventoryService->recordTransaction(
                    $orgId,
                    $itemData['product_id'],
                    $itemData['quantity'],
                    $txnType,
                    $noteNumber,
                    "Stock movement via {$noteType} #{$noteNumber} against Invoice #{$invoice->invoice_number}",
                    $userId
                );
            }

            $this->auditService->log(
                $orgId,
                $userId,
                "{$noteType}_created",
                $note,
                $note->id,
                null,
                $note->load('items')->toArray()
            );

            return $note->fresh(['client', 'invoice', 'items.product']);
        });
    }
}
