<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportDataService
{
    public function __construct(
        protected FinancialYearService $fyService,
        protected PaymentStatusService $statusService
    ) {}

    /**
     * Get Authoritative Client Ledger Report Data
     */
    public function getLedgerReport(int $clientId, int $orgId, ?string $from = null, ?string $to = null, ?string $fy = null): array
    {
        $dateRange = $this->fyService->resolveDateRange($from, $to, $fy);
        $fromDate = $dateRange['from'];
        $toDate = $dateRange['to'];

        $organization = Organization::findOrFail($orgId);
        $client = Client::where('id', $clientId)->where('organization_id', $orgId)->firstOrFail();

        $invoices = Invoice::where('client_id', $clientId)
            ->where('organization_id', $orgId)
            ->where('status', 'finalized')
            ->where('document_type', 'invoice')
            ->get();

        $payments = Payment::with('allocations.invoice')
            ->where('client_id', $clientId)
            ->where('organization_id', $orgId)
            ->get();

        $allEntries = collect();

        foreach ($invoices as $inv) {
            $totalAmount = round((float) $inv->total_amount, 2);
            $paidAmount = round((float) $inv->paid_amount, 2);
            $outstanding = round($totalAmount - $paidAmount, 2);

            $allEntries->push([
                'entry_type'         => 'invoice',
                'date'               => Carbon::parse($inv->date)->format('Y-m-d'),
                'id'                 => $inv->id,
                'invoice_id'         => $inv->id,
                'invoice_number'     => $inv->invoice_number,
                'document_type'      => $inv->document_type,
                'description'        => "Tax Invoice #{$inv->invoice_number}",
                'debit'              => $totalAmount,
                'credit'             => 0.00,
                'due_date'           => !empty($inv->due_date) ? Carbon::parse($inv->due_date)->format('Y-m-d') : null,
                'paid_amount'        => $paidAmount,
                'outstanding_amount' => $outstanding,
                'status'             => $this->statusService->getPaymentStatus($inv),
                'created_at'         => $inv->created_at ? $inv->created_at->toDateTimeString() : null,
            ]);
        }

        foreach ($payments as $pay) {
            $amount = round((float) $pay->amount, 2);
            $unallocated = round((float) $pay->unallocated_amount, 2);
            $allocated = round($amount - $unallocated, 2);

            $allEntries->push([
                'entry_type'            => 'payment',
                'date'                  => Carbon::parse($pay->payment_date)->format('Y-m-d'),
                'id'                    => $pay->id,
                'payment_id'            => $pay->id,
                'description'           => "Payment ({$pay->payment_mode}" . ($pay->transaction_reference ? " - Ref: {$pay->transaction_reference}" : "") . ")",
                'payment_mode'          => $pay->payment_mode,
                'transaction_reference' => $pay->transaction_reference,
                'debit'                 => 0.00,
                'credit'                => $amount,
                'allocated_amount'      => $allocated,
                'unallocated_amount'    => $unallocated,
                'allocations'           => $pay->allocations,
                'created_at'            => $pay->created_at ? $pay->created_at->toDateTimeString() : null,
            ]);
        }

        $sortedEntries = $allEntries->sortBy([
            ['date', 'asc'],
            ['created_at', 'asc'],
            ['id', 'asc'],
        ])->values();

        $openingBalance = 0.00;
        $filteredEntries = collect();

        foreach ($sortedEntries as $entry) {
            $entryDate = $entry['date'];

            if ($fromDate && $entryDate < $fromDate) {
                $openingBalance = round($openingBalance + ($entry['debit'] - $entry['credit']), 2);
                continue;
            }

            if ($toDate && $entryDate > $toDate) {
                continue;
            }

            $filteredEntries->push($entry);
        }

        $runningBalance = $openingBalance;
        $statement = $filteredEntries->map(function ($entry) use (&$runningBalance) {
            $runningBalance = round($runningBalance + ($entry['debit'] - $entry['credit']), 2);
            $entry['running_balance'] = $runningBalance;
            return $entry;
        });

        $closingBalance = $runningBalance;

        // Invoices list in period for Invoice Details sheet
        $periodInvoices = Invoice::with(['items.product'])
            ->where('client_id', $clientId)
            ->where('organization_id', $orgId)
            ->where('status', 'finalized')
            ->where('document_type', 'invoice')
            ->when($fromDate, fn($q) => $q->where('date', '>=', $fromDate))
            ->when($toDate, fn($q) => $q->where('date', '<=', $toDate))
            ->get();

        // Payments list in period for Payments sheet
        $periodPayments = Payment::where('client_id', $clientId)
            ->where('organization_id', $orgId)
            ->when($fromDate, fn($q) => $q->where('payment_date', '>=', $fromDate))
            ->when($toDate, fn($q) => $q->where('payment_date', '<=', $toDate))
            ->get();

        return [
            'organization'        => $organization,
            'client'              => $client,
            'from'                => $fromDate,
            'to'                  => $toDate,
            'financial_year'      => $dateRange['financial_year'],
            'opening_balance'     => $openingBalance,
            'closing_balance'     => $closingBalance,
            'current_outstanding' => $closingBalance,
            'statement'           => $statement,
            'period_invoices'     => $periodInvoices,
            'period_payments'     => $periodPayments,
            'generated_at'        => now()->toDateTimeString(),
        ];
    }

    /**
     * Get Invoice Register Report Data
     */
    public function getInvoiceRegisterReport(int $orgId, ?int $clientId = null, ?string $from = null, ?string $to = null, ?string $fy = null): array
    {
        $dateRange = $this->fyService->resolveDateRange($from, $to, $fy);
        $fromDate = $dateRange['from'];
        $toDate = $dateRange['to'];

        $organization = Organization::findOrFail($orgId);

        $query = Invoice::with('client')
            ->where('organization_id', $orgId)
            ->where('status', 'finalized')
            ->where('document_type', 'invoice');

        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        if ($fromDate) {
            $query->where('date', '>=', $fromDate);
        }

        if ($toDate) {
            $query->where('date', '<=', $toDate);
        }

        $invoices = $query->orderBy('date', 'asc')->orderBy('invoice_number', 'asc')->get();

        $totals = [
            'taxable_amount' => 0.00,
            'cgst_amount'    => 0.00,
            'sgst_amount'    => 0.00,
            'igst_amount'    => 0.00,
            'total_gst'      => 0.00,
            'grand_total'    => 0.00,
            'paid_amount'    => 0.00,
            'outstanding'    => 0.00,
        ];

        $records = $invoices->map(function ($inv) use (&$totals) {
            $subtotal = round((float) $inv->subtotal, 2);
            $cgst = round((float) $inv->cgst_total, 2);
            $sgst = round((float) $inv->sgst_total, 2);
            $igst = round((float) $inv->igst_total, 2);
            $totalGst = round((float) $inv->total_gst, 2);
            $totalAmount = round((float) $inv->total_amount, 2);
            $paidAmount = round((float) $inv->paid_amount, 2);
            $outstanding = round($totalAmount - $paidAmount, 2);

            $totals['taxable_amount'] += $subtotal;
            $totals['cgst_amount'] += $cgst;
            $totals['sgst_amount'] += $sgst;
            $totals['igst_amount'] += $igst;
            $totals['total_gst'] += $totalGst;
            $totals['grand_total'] += $totalAmount;
            $totals['paid_amount'] += $paidAmount;
            $totals['outstanding'] += $outstanding;

            return [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'date'           => Carbon::parse($inv->date)->format('Y-m-d'),
                'due_date'       => !empty($inv->due_date) ? Carbon::parse($inv->due_date)->format('Y-m-d') : null,
                'client_name'    => $inv->client?->name,
                'client_gstin'   => $inv->client?->gst_number,
                'client_state'   => $inv->client?->state,
                'taxable_amount' => $subtotal,
                'cgst_amount'    => $cgst,
                'sgst_amount'    => $sgst,
                'igst_amount'    => $igst,
                'total_gst'      => $totalGst,
                'grand_total'    => $totalAmount,
                'paid_amount'    => $paidAmount,
                'outstanding'    => $outstanding,
                'status'         => $this->statusService->getPaymentStatus($inv),
            ];
        });

        // Round summary totals
        foreach ($totals as $k => $v) {
            $totals[$k] = round($v, 2);
        }

        return [
            'organization'   => $organization,
            'from'           => $fromDate,
            'to'             => $toDate,
            'financial_year' => $dateRange['financial_year'],
            'invoices'       => $records,
            'totals'         => $totals,
            'generated_at'   => now()->toDateTimeString(),
        ];
    }

    /**
     * Get GSTR-1 Tax Export Report Data
     */
    public function getGstr1Report(int $orgId, ?string $from = null, ?string $to = null, ?string $fy = null): array
    {
        $dateRange = $this->fyService->resolveDateRange($from, $to, $fy);
        $fromDate = $dateRange['from'];
        $toDate = $dateRange['to'];

        $organization = Organization::findOrFail($orgId);

        $query = Invoice::with(['client', 'items.product'])
            ->where('organization_id', $orgId)
            ->where('status', 'finalized')
            ->where('document_type', 'invoice');

        if ($fromDate) {
            $query->where('date', '>=', $fromDate);
        }

        if ($toDate) {
            $query->where('date', '<=', $toDate);
        }

        $invoices = $query->orderBy('date', 'asc')->orderBy('invoice_number', 'asc')->get();

        $b2bInvoices = collect();
        $b2cInvoices = collect();
        $hsnSummaryMap = [];

        foreach ($invoices as $inv) {
            $hasGstin = !empty($inv->client?->gst_number);
            $invRow = [
                'gstin'            => $organization->gst_number,
                'invoice_number'   => $inv->invoice_number,
                'invoice_date'     => Carbon::parse($inv->date)->format('Y-m-d'),
                'customer_name'    => $inv->client?->name,
                'customer_gstin'   => $inv->client?->gst_number ?? 'URP',
                'place_of_supply'  => $inv->client?->state ?? $organization->state,
                'reverse_charge'   => 'N',
                'invoice_type'     => 'Regular',
                'invoice_value'    => round((float) $inv->total_amount, 2),
                'taxable_amount'   => round((float) $inv->subtotal, 2),
                'cgst_amount'      => round((float) $inv->cgst_total, 2),
                'sgst_amount'      => round((float) $inv->sgst_total, 2),
                'igst_amount'      => round((float) $inv->igst_total, 2),
                'total_tax_amount' => round((float) $inv->total_gst, 2),
            ];

            if ($hasGstin) {
                $b2bInvoices->push($invRow);
            } else {
                $b2cInvoices->push($invRow);
            }

            foreach ($inv->items as $item) {
                $hsn = $item->product?->hsn_code ?? 'NA';
                $rate = (float) $item->gst_rate;
                $key = "{$hsn}_{$rate}";

                if (!isset($hsnSummaryMap[$key])) {
                    $hsnSummaryMap[$key] = [
                        'hsn_code'       => $hsn,
                        'description'    => $item->product?->name ?? '',
                        'uqc'            => $item->product?->unit ?? 'NOS',
                        'gst_rate'       => $rate,
                        'total_quantity' => 0,
                        'taxable_value'  => 0.00,
                        'cgst_amount'    => 0.00,
                        'sgst_amount'    => 0.00,
                        'igst_amount'    => 0.00,
                        'total_tax'      => 0.00,
                    ];
                }

                $hsnSummaryMap[$key]['total_quantity'] += (int) $item->quantity;
                $hsnSummaryMap[$key]['taxable_value'] += (float) $item->taxable_amount;
                $hsnSummaryMap[$key]['cgst_amount'] += (float) $item->cgst_amount;
                $hsnSummaryMap[$key]['sgst_amount'] += (float) $item->sgst_amount;
                $hsnSummaryMap[$key]['igst_amount'] += (float) $item->igst_amount;
                $hsnSummaryMap[$key]['total_tax'] += ((float) $item->cgst_amount + (float) $item->sgst_amount + (float) $item->igst_amount);
            }
        }

        $hsnSummary = collect(array_values($hsnSummaryMap))->map(function ($row) {
            $row['taxable_value'] = round($row['taxable_value'], 2);
            $row['cgst_amount'] = round($row['cgst_amount'], 2);
            $row['sgst_amount'] = round($row['sgst_amount'], 2);
            $row['igst_amount'] = round($row['igst_amount'], 2);
            $row['total_tax'] = round($row['total_tax'], 2);
            return $row;
        });

        return [
            'organization'   => $organization,
            'from'           => $fromDate,
            'to'             => $toDate,
            'financial_year' => $dateRange['financial_year'],
            'b2b_invoices'   => $b2bInvoices,
            'b2c_invoices'   => $b2cInvoices,
            'hsn_summary'    => $hsnSummary,
            'generated_at'   => now()->toDateTimeString(),
        ];
    }

    /**
     * Get Audit Trail Report Data
     */
    public function getAuditReport(int $orgId, ?int $userId = null, ?string $action = null, ?string $entityType = null, ?string $from = null, ?string $to = null): array
    {
        $organization = Organization::findOrFail($orgId);

        $query = AuditLog::with('user:id,name,email')
            ->where('organization_id', $orgId);

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($action) {
            $query->where('action', $action);
        }

        if ($entityType) {
            $query->where('auditable_type', $entityType);
        }

        if ($from) {
            $query->where('created_at', '>=', "{$from} 00:00:00");
        }

        if ($to) {
            $query->where('created_at', '<=', "{$to} 23:59:59");
        }

        $logs = $query->latest('id')->get()->map(function ($log) {
            // Strip any sensitive fields if present
            $before = $log->before_data;
            $after = $log->after_data;

            if (is_array($before)) {
                unset($before['password'], $before['remember_token'], $before['api_token']);
            }
            if (is_array($after)) {
                unset($after['password'], $after['remember_token'], $after['api_token']);
            }

            return [
                'id'             => $log->id,
                'created_at'     => $log->created_at?->toDateTimeString(),
                'user_name'      => $log->user?->name ?? 'System',
                'user_email'     => $log->user?->email,
                'action'         => $log->action,
                'auditable_type' => $log->auditable_type,
                'auditable_id'   => $log->auditable_id,
                'before_data'    => $before,
                'after_data'     => $after,
            ];
        });

        return [
            'organization' => $organization,
            'from'         => $from,
            'to'           => $to,
            'logs'         => $logs,
            'generated_at' => now()->toDateTimeString(),
        ];
    }
}
