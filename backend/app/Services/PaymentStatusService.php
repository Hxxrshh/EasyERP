<?php

namespace App\Services;

use App\Models\Invoice;
use Carbon\Carbon;

class PaymentStatusService
{
    /**
     * Determine authoritative payment status for an invoice:
     * - Paid: outstanding <= 0
     * - Partial: paid_amount > 0 AND outstanding > 0
     * - Overdue: outstanding > 0 AND current date > due_date
     * - Pending: paid_amount <= 0 AND current date <= due_date
     */
    public function getPaymentStatus(mixed $invoice, ?Carbon $now = null): string
    {
        $total = (float) ($invoice->total_amount ?? 0.00);
        $paid = (float) ($invoice->paid_amount ?? 0.00);
        $outstanding = round($total - $paid, 2);

        if ($outstanding <= 0) {
            return 'Paid';
        }

        if ($paid > 0) {
            return 'Partial';
        }

        $currentDate = $now ?? Carbon::now();
        $dueDate = !empty($invoice->due_date) ? Carbon::parse($invoice->due_date) : Carbon::parse($invoice->date);

        if ($currentDate->greaterThan($dueDate->endOfDay())) {
            return 'Overdue';
        }

        return 'Pending';
    }
}
