<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InvoiceSequenceService
{
    /**
     * Generate the next invoice sequence number for an organization based on Indian Financial Year.
     *
     * Format: 001/26-27, 002/26-27, etc.
     */
    public function generateNextNumber(int $organizationId, string $dateString): string
    {
        $date = Carbon::parse($dateString);
        $year = $date->year;

        // Indian Financial Year starts on April 1st
        if ($date->month >= 4) {
            $fyStartYear = $year;
            $fyEndYear = $year + 1;
        } else {
            $fyStartYear = $year - 1;
            $fyEndYear = $year;
        }

        $financialYear = sprintf('%02d-%02d', $fyStartYear % 100, $fyEndYear % 100);

        return DB::transaction(function () use ($organizationId, $financialYear) {
            $seqRow = DB::table('invoice_sequences')
                ->where('organization_id', $organizationId)
                ->where('financial_year', $financialYear)
                ->lockForUpdate()
                ->first();

            if ($seqRow) {
                $nextSequence = (int) $seqRow->current_sequence + 1;
                DB::table('invoice_sequences')
                    ->where('id', $seqRow->id)
                    ->update([
                        'current_sequence' => $nextSequence,
                        'updated_at'       => now(),
                    ]);
            } else {
                $nextSequence = 1;
                DB::table('invoice_sequences')->insert([
                    'organization_id'  => $organizationId,
                    'financial_year'   => $financialYear,
                    'current_sequence' => 1,
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);
            }

            return sprintf('%03d/%s', $nextSequence, $financialYear);
        });
    }
}
