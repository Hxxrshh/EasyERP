<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Organization;

class GstCalculatorService
{
    /**
     * Calculate item tax breakdown and invoice totals.
     *
     * @param Organization $organization
     * @param Client $client
     * @param array $items Array of ['product_id' => int, 'quantity' => float, 'rate' => float, 'gst_rate' => float]
     * @return array Calculated accounting totals and items breakdown
     */
    public function calculate(Organization $organization, Client $client, array $items): array
    {
        $hasGst = !empty(trim((string) $organization->gst_number));

        // State comparison (case-insensitive trim)
        $sellerState = strtolower(trim((string) $organization->state));
        $buyerState = strtolower(trim((string) $client->state));
        $isSameState = ($sellerState !== '' && $sellerState === $buyerState);

        $subtotal = 0.00;
        $cgstTotal = 0.00;
        $sgstTotal = 0.00;
        $igstTotal = 0.00;
        $calculatedItems = [];

        foreach ($items as $item) {
            $quantity = (float) $item['quantity'];
            $rate = (float) $item['rate'];
            $configuredGstRate = (float) ($item['gst_rate'] ?? 0.00);

            $taxableAmount = round($quantity * $rate, 2);

            if (!$hasGst) {
                // Non-GST Organization: disable tax
                $cgstRate = 0.00;
                $sgstRate = 0.00;
                $igstRate = 0.00;
                $cgstAmount = 0.00;
                $sgstAmount = 0.00;
                $igstAmount = 0.00;
            } elseif ($isSameState) {
                // Intra-state: CGST + SGST
                $cgstRate = round($configuredGstRate / 2, 2);
                $sgstRate = round($configuredGstRate / 2, 2);
                $igstRate = 0.00;

                $cgstAmount = round($taxableAmount * ($cgstRate / 100), 2);
                $sgstAmount = round($taxableAmount * ($sgstRate / 100), 2);
                $igstAmount = 0.00;
            } else {
                // Inter-state: IGST
                $cgstRate = 0.00;
                $sgstRate = 0.00;
                $igstRate = round($configuredGstRate, 2);

                $cgstAmount = 0.00;
                $sgstAmount = 0.00;
                $igstAmount = round($taxableAmount * ($igstRate / 100), 2);
            }

            $itemTaxTotal = round($cgstAmount + $sgstAmount + $igstAmount, 2);
            $itemGrandTotal = round($taxableAmount + $itemTaxTotal, 2);

            $subtotal = round($subtotal + $taxableAmount, 2);
            $cgstTotal = round($cgstTotal + $cgstAmount, 2);
            $sgstTotal = round($sgstTotal + $sgstAmount, 2);
            $igstTotal = round($igstTotal + $igstAmount, 2);

            $calculatedItems[] = [
                'product_id'     => $item['product_id'],
                'quantity'       => $quantity,
                'rate'           => $rate,
                'gst_rate'       => $configuredGstRate,
                'taxable_amount' => $taxableAmount,
                'cgst_rate'       => $cgstRate,
                'sgst_rate'       => $sgstRate,
                'igst_rate'       => $igstRate,
                'cgst_amount'     => $cgstAmount,
                'sgst_amount'     => $sgstAmount,
                'igst_amount'     => $igstAmount,
                'amount'          => $itemGrandTotal,
            ];
        }

        $totalGst = round($cgstTotal + $sgstTotal + $igstTotal, 2);
        $grandTotal = round($subtotal + $totalGst, 2);

        return [
            'subtotal'    => $subtotal,
            'cgst_total'  => $cgstTotal,
            'sgst_total'  => $sgstTotal,
            'igst_total'  => $igstTotal,
            'total_gst'   => $totalGst,
            'grand_total' => $grandTotal,
            'items'       => $calculatedItems,
        ];
    }
}
