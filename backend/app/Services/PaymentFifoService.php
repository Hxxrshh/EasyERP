<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PaymentFifoService
{
    /**
     * Allocate payment using FIFO approach against unpaid or partially paid finalized Tax Invoices.
     */
    public function allocate(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $remainingAmount = round((float) $payment->amount, 2);

            if ($remainingAmount <= 0) {
                $payment->update(['unallocated_amount' => 0.00]);
                return;
            }

            // Fetch finalized tax invoices for client & organization with unpaid amounts
            $invoices = DB::table('invoices')
                ->where('organization_id', $payment->organization_id)
                ->where('client_id', $payment->client_id)
                ->where('status', 'finalized')
                ->where('document_type', 'invoice')
                ->whereRaw('paid_amount < total_amount')
                ->orderBy('date', 'asc')
                ->orderBy('id', 'asc')
                ->lockForUpdate()
                ->get();

            foreach ($invoices as $invoice) {
                if ($remainingAmount <= 0) {
                    break;
                }

                $due = round((float) $invoice->total_amount - (float) $invoice->paid_amount, 2);
                if ($due <= 0) {
                    continue;
                }

                $allocation = round(min($due, $remainingAmount), 2);

                // Record allocation in payment_invoice_map
                DB::table('payment_invoice_map')->insert([
                    'payment_id'     => $payment->id,
                    'invoice_id'     => $invoice->id,
                    'amount_applied' => $allocation,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);

                // Increment invoice paid_amount
                DB::table('invoices')
                    ->where('id', $invoice->id)
                    ->increment('paid_amount', $allocation);

                $remainingAmount = round($remainingAmount - $allocation, 2);
            }

            // Save unallocated excess amount
            $payment->update(['unallocated_amount' => $remainingAmount]);
        });
    }

    /**
     * Manually allocate an unallocated amount of a payment to a specific finalized tax invoice.
     */
    public function allocateManually(Payment $payment, Invoice $invoice, float $amount): array
    {
        $amountToAllocate = round($amount, 2);

        if ($amountToAllocate <= 0) {
            throw new InvalidArgumentException("Allocation amount must be greater than zero.");
        }

        return DB::transaction(function () use ($payment, $invoice, $amountToAllocate) {
            $lockedPayment = DB::table('payments')
                ->where('id', $payment->id)
                ->lockForUpdate()
                ->first();

            $lockedInvoice = DB::table('invoices')
                ->where('id', $invoice->id)
                ->lockForUpdate()
                ->first();

            $unallocated = round((float) $lockedPayment->unallocated_amount, 2);
            $due = round((float) $lockedInvoice->total_amount - (float) $lockedInvoice->paid_amount, 2);

            if ($amountToAllocate > $unallocated) {
                throw new InvalidArgumentException("Allocation amount ({$amountToAllocate}) exceeds available unallocated payment balance ({$unallocated}).");
            }

            if ($amountToAllocate > $due) {
                throw new InvalidArgumentException("Allocation amount ({$amountToAllocate}) exceeds invoice outstanding balance ({$due}).");
            }

            $mapId = DB::table('payment_invoice_map')->insertGetId([
                'payment_id'     => $payment->id,
                'invoice_id'     => $invoice->id,
                'amount_applied' => $amountToAllocate,
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            DB::table('invoices')
                ->where('id', $invoice->id)
                ->increment('paid_amount', $amountToAllocate);

            $newUnallocated = round($unallocated - $amountToAllocate, 2);
            DB::table('payments')
                ->where('id', $payment->id)
                ->update([
                    'unallocated_amount' => $newUnallocated,
                    'updated_at'         => now(),
                ]);

            $newInvoiceOutstanding = round($due - $amountToAllocate, 2);
            $totalAllocated = round((float) $lockedPayment->amount - $newUnallocated, 2);

            return [
                'payment_id'                 => $payment->id,
                'invoice_id'                 => $invoice->id,
                'allocation_id'              => $mapId,
                'amount_applied'             => $amountToAllocate,
                'total_allocated'            => $totalAllocated,
                'unallocated_amount'         => $newUnallocated,
                'invoice_outstanding_amount' => $newInvoiceOutstanding,
            ];
        });
    }
}
