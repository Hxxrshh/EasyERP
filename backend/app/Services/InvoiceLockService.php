<?php

namespace App\Services;

use App\Models\Invoice;
use Carbon\Carbon;

class InvoiceLockService
{
    /**
     * Get the cutoff lock date for an invoice.
     * Cutoff is 00:00 on the 6th day of the month following the invoice date (i.e. after 5th of next month).
     */
    public function getLockDate(mixed $invoiceDate): Carbon
    {
        $date = Carbon::parse($invoiceDate);
        return $date->copy()->addMonth()->startOfMonth()->addDays(5)->startOfDay();
    }

    /**
     * Determine if a finalized invoice is accounting-locked.
     */
    public function isLocked(Invoice $invoice, ?Carbon $now = null): bool
    {
        if ($invoice->status !== 'finalized') {
            return false;
        }

        if ($invoice->locked_at !== null) {
            return true;
        }

        $currentTime = $now ?? Carbon::now();
        $lockDate = $this->getLockDate($invoice->date);

        return $currentTime->greaterThanOrEqualTo($lockDate);
    }
}
