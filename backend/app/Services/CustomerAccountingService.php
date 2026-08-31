<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use Carbon\Carbon;

class CustomerAccountingService
{
    /**
     * Get authoritative accounting summary & aging metrics for a specific client.
     */
    public function getCustomerSummary(Client $client): array
    {
        $today = Carbon::today();

        // Finalized invoices query
        $invoices = Invoice::where('client_id', $client->id)
            ->where('organization_id', $client->organization_id)
            ->where('status', 'finalized')
            ->get();

        // Payments query
        $payments = Payment::where('client_id', $client->id)
            ->where('organization_id', $client->organization_id)
            ->get();

        $totalInvoiced = (float) $invoices->sum('total_amount');
        $totalPaid = (float) $payments->sum('amount');
        $totalOutstanding = 0.0;
        $overdueOutstanding = 0.0;
        $overdueCount = 0;

        $notDue = 0.0;
        $days1_30 = 0.0;
        $days31_60 = 0.0;
        $days61_90 = 0.0;
        $days90Plus = 0.0;

        foreach ($invoices as $inv) {
            $unpaid = (float) ($inv->total_amount - $inv->paid_amount);
            if ($unpaid <= 0.001) {
                continue;
            }

            $totalOutstanding += $unpaid;

            // Calculate due date
            $invDate = $inv->date ? Carbon::parse($inv->date) : Carbon::today();
            $dueDays = $client->default_due_days ?? 30;
            $dueDate = $inv->due_date ? Carbon::parse($inv->due_date) : $invDate->copy()->addDays($dueDays);

            if ($today->gt($dueDate)) {
                $overdueOutstanding += $unpaid;
                $overdueCount++;

                $daysOverdue = (int) Carbon::parse($dueDate)->diffInDays($today);
                if ($daysOverdue <= 30) {
                    $days1_30 += $unpaid;
                } elseif ($daysOverdue <= 60) {
                    $days31_60 += $unpaid;
                } elseif ($daysOverdue <= 90) {
                    $days61_90 += $unpaid;
                } else {
                    $days90Plus += $unpaid;
                }
            } else {
                $notDue += $unpaid;
            }
        }

        $lastInvoice = Invoice::where('client_id', $client->id)
            ->where('organization_id', $client->organization_id)
            ->where('status', 'finalized')
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->first();

        $lastPayment = Payment::where('client_id', $client->id)
            ->where('organization_id', $client->organization_id)
            ->orderBy('payment_date', 'desc')
            ->orderBy('id', 'desc')
            ->first();

        return [
            'client' => [
                'id'                 => $client->id,
                'name'               => $client->name,
                'company_name'       => $client->company_name,
                'short_name'         => $client->short_name,
                'gst_number'         => $client->gst_number,
                'state'              => $client->state,
                'billing_address'    => $client->billing_address,
                'contact_phone'      => $client->contact_phone,
                'contact_whatsapp'   => $client->contact_whatsapp,
                'default_due_days'   => $client->default_due_days,
                'preferred_template' => $client->preferred_template,
            ],
            'metrics' => [
                'total_invoiced'        => round($totalInvoiced, 2),
                'total_paid'            => round($totalPaid, 2),
                'total_outstanding'     => round($totalOutstanding, 2),
                'overdue_outstanding'   => round($overdueOutstanding, 2),
                'overdue_invoice_count' => $overdueCount,
            ],
            'aging_buckets' => [
                'not_due'      => round($notDue, 2),
                'days_1_30'    => round($days1_30, 2),
                'days_31_60'   => round($days31_60, 2),
                'days_61_90'   => round($days61_90, 2),
                'days_90_plus' => round($days90Plus, 2),
            ],
            'last_invoice' => $lastInvoice ? [
                'id'             => $lastInvoice->id,
                'invoice_number' => $lastInvoice->invoice_number,
                'date'           => $lastInvoice->date ? Carbon::parse($lastInvoice->date)->format('Y-m-d') : null,
                'total_amount'   => (float) $lastInvoice->total_amount,
            ] : null,
            'last_payment' => $lastPayment ? [
                'id'           => $lastPayment->id,
                'payment_date' => $lastPayment->payment_date ? Carbon::parse($lastPayment->payment_date)->format('Y-m-d') : null,
                'amount'       => (float) $lastPayment->amount,
                'payment_mode' => $lastPayment->payment_mode,
            ] : null,
        ];
    }

    /**
     * Get authoritative operational dashboard overview metrics for an organization.
     */
    public function getDashboardOverview(int $orgId): array
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::today()->startOfMonth();

        $allFinalizedInvoices = Invoice::where('organization_id', $orgId)
            ->where('status', 'finalized')
            ->get();

        $totalReceivables = 0.0;
        $overdueReceivables = 0.0;
        $overdueInvoiceCount = 0;

        foreach ($allFinalizedInvoices as $inv) {
            $unpaid = (float) ($inv->total_amount - $inv->paid_amount);
            if ($unpaid > 0.001) {
                $totalReceivables += $unpaid;

                $invDate = $inv->date ? Carbon::parse($inv->date) : Carbon::today();
                $dueDays = $inv->client?->default_due_days ?? 30;
                $dueDate = $inv->due_date ? Carbon::parse($inv->due_date) : $invDate->copy()->addDays($dueDays);

                if ($today->gt($dueDate)) {
                    $overdueReceivables += $unpaid;
                    $overdueInvoiceCount++;
                }
            }
        }

        $todayCollections = (float) Payment::where('organization_id', $orgId)
            ->whereDate('payment_date', $today->toDateString())
            ->sum('amount');

        $thisMonthSales = (float) Invoice::where('organization_id', $orgId)
            ->where('status', 'finalized')
            ->whereDate('date', '>=', $startOfMonth->toDateString())
            ->sum('total_amount');

        $pendingInvoicesCount = Invoice::where('organization_id', $orgId)
            ->where('status', 'draft')
            ->count();

        $activeCustomersCount = Client::where('organization_id', $orgId)->count();

        // Recent Invoices
        $recentInvoices = Invoice::with('client')
            ->where('organization_id', $orgId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($inv) {
                return [
                    'id'             => $inv->id,
                    'invoice_number' => $inv->invoice_number ?: 'Draft',
                    'client_name'    => $inv->client?->name ?? 'Unknown',
                    'date'           => $inv->date ? Carbon::parse($inv->date)->format('Y-m-d') : null,
                    'total_amount'   => (float) $inv->total_amount,
                    'paid_amount'    => (float) $inv->paid_amount,
                    'status'         => $inv->status,
                    'document_type'  => $inv->document_type,
                    'tax_mode'       => $inv->tax_mode,
                ];
            });

        // Recent Payments
        $recentPayments = Payment::with('client')
            ->where('organization_id', $orgId)
            ->orderBy('payment_date', 'desc')
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($pay) {
                return [
                    'id'            => $pay->id,
                    'client_name'   => $pay->client?->name ?? 'Unknown',
                    'amount'        => (float) $pay->amount,
                    'unallocated'   => (float) $pay->unallocated_amount,
                    'payment_date'  => $pay->payment_date ? Carbon::parse($pay->payment_date)->format('Y-m-d') : null,
                    'payment_mode'  => $pay->payment_mode,
                ];
            });

        // Top Outstanding Clients
        $clients = Client::where('organization_id', $orgId)->get();
        $topOutstanding = [];
        foreach ($clients as $cl) {
            $sum = $this->getCustomerSummary($cl);
            if ($sum['metrics']['total_outstanding'] > 0) {
                $topOutstanding[] = [
                    'client_id'           => $cl->id,
                    'client_name'         => $cl->name,
                    'total_outstanding'   => $sum['metrics']['total_outstanding'],
                    'overdue_outstanding' => $sum['metrics']['overdue_outstanding'],
                ];
            }
        }
        usort($topOutstanding, fn($a, $b) => $b['total_outstanding'] <=> $a['total_outstanding']);
        $topOutstanding = array_slice($topOutstanding, 0, 5);

        return [
            'metrics' => [
                'total_receivables'      => round($totalReceivables, 2),
                'overdue_receivables'    => round($overdueReceivables, 2),
                'today_collections'      => round($todayCollections, 2),
                'this_month_sales'       => round($thisMonthSales, 2),
                'pending_invoices_count' => $pendingInvoicesCount,
                'overdue_invoices_count' => $overdueInvoiceCount,
                'active_customers_count' => $activeCustomersCount,
            ],
            'recent_invoices'           => $recentInvoices,
            'recent_payments'           => $recentPayments,
            'top_outstanding_customers' => $topOutstanding,
        ];
    }
}
