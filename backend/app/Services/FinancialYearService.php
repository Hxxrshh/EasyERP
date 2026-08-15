<?php

namespace App\Services;

use InvalidArgumentException;

class FinancialYearService
{
    /**
     * Resolve date range from explicitly provided from/to dates or a financial_year parameter (e.g. 2026-27 or 2026-2027).
     *
     * Returns: ['from' => 'YYYY-MM-DD', 'to' => 'YYYY-MM-DD', 'financial_year' => '2026-27']
     */
    public function resolveDateRange(?string $from = null, ?string $to = null, ?string $financialYear = null): array
    {
        $resolvedFrom = $from;
        $resolvedTo = $to;
        $resolvedFy = $financialYear;

        if ($financialYear) {
            $fyPattern = '/^(\d{4})-(\d{2}|\d{4})$/';
            if (!preg_match($fyPattern, trim($financialYear), $matches)) {
                throw new InvalidArgumentException("Invalid financial year format. Expected format 'YYYY-YY' (e.g., '2026-27').");
            }

            $startYear = (int) $matches[1];
            $resolvedFrom = "{$startYear}-04-01";
            $endYear = $startYear + 1;
            $shortEndYear = substr((string) $endYear, -2);
            $resolvedTo = "{$endYear}-03-31";
            $resolvedFy = "{$startYear}-{$shortEndYear}";
        }

        if ($resolvedFrom && $resolvedTo && $resolvedFrom > $resolvedTo) {
            throw new InvalidArgumentException("The 'from' date cannot be after the 'to' date.");
        }

        return [
            'from'           => $resolvedFrom,
            'to'             => $resolvedTo,
            'financial_year' => $resolvedFy,
        ];
    }
}
