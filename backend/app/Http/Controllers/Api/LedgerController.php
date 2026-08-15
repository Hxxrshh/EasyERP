<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\AuditLogService;
use App\Services\PaymentFifoService;
use App\Services\PaymentStatusService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LedgerController extends Controller
{
    public function getClientStatement(int $clientId, Request $request, PaymentStatusService $statusService): JsonResponse
    {
        $request->validate([
            'from' => 'nullable|date_format:Y-m-d',
            'to'   => 'nullable|date_format:Y-m-d',
        ]);

        $orgId = $request->attributes->get('active_organization_id');
        $client = Client::where('id', $clientId)
            ->where('organization_id', $orgId)
            ->first();

        if (!$client) {
            return response()->json(['message' => 'Client not found.'], 404);
        }

        $fromDate = $request->query('from');
        $toDate = $request->query('to');

        // Fetch all finalized tax invoices for client
        $invoices = Invoice::where('client_id', $clientId)
            ->where('organization_id', $orgId)
            ->where('status', 'finalized')
            ->where('document_type', 'invoice')
            ->get();

        // Fetch all payments for client
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
                'debit'              => $totalAmount,
                'credit'             => 0.00,
                'due_date'           => !empty($inv->due_date) ? Carbon::parse($inv->due_date)->format('Y-m-d') : null,
                'paid_amount'        => $paidAmount,
                'outstanding_amount' => $outstanding,
                'status'             => $statusService->getPaymentStatus($inv),
                'created_at'         => $inv->created_at ? $inv->created_at->toDateTimeString() : null,
            ]);
        }

        foreach ($payments as $pay) {
            $amount = round((float) $pay->amount, 2);
            $unallocated = round((float) $pay->unallocated_amount, 2);
            $allocated = round($amount - $unallocated, 2);

            $allocations = $pay->allocations->map(function ($a) {
                return [
                    'invoice_id'     => $a->invoice_id,
                    'invoice_number' => $a->invoice?->invoice_number,
                    'amount_applied' => round((float) $a->amount_applied, 2),
                ];
            });

            $allEntries->push([
                'entry_type'            => 'payment',
                'date'                  => Carbon::parse($pay->payment_date)->format('Y-m-d'),
                'id'                    => $pay->id,
                'payment_id'            => $pay->id,
                'payment_mode'          => $pay->payment_mode,
                'transaction_reference' => $pay->transaction_reference,
                'debit'                 => 0.00,
                'credit'                => $amount,
                'allocated_amount'      => $allocated,
                'unallocated_amount'    => $unallocated,
                'allocations'           => $allocations,
                'created_at'            => $pay->created_at ? $pay->created_at->toDateTimeString() : null,
            ]);
        }

        // Sort chronologically
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

        // Overall total outstanding balance for client
        $totalDebits = $sortedEntries->sum('debit');
        $totalCredits = $sortedEntries->sum('credit');
        $currentOutstanding = round($totalDebits - $totalCredits, 2);

        return response()->json([
            'client'              => $client,
            'opening_balance'     => $openingBalance,
            'current_outstanding' => $currentOutstanding,
            'statement'           => $statement,
        ]);
    }

    public function recordPayment(StorePaymentRequest $request, PaymentFifoService $fifoService, AuditLogService $auditService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditors are not permitted to record payments.'], 403);
        }

        $orgId = $request->attributes->get('active_organization_id');
        $user = $request->user();
        $validated = $request->validated();

        $clientExists = Client::where('id', $validated['client_id'])
            ->where('organization_id', $orgId)
            ->exists();

        if (!$clientExists) {
            return response()->json(['message' => 'Client does not belong to this organization.'], 403);
        }

        $validated['organization_id'] = $orgId;
        $validated['user_id'] = $user?->id;

        $payment = DB::transaction(function () use ($validated, $orgId, $user, $fifoService, $auditService) {
            $payment = Payment::create($validated);
            $fifoService->allocate($payment);
            $freshPayment = $payment->fresh(['allocations.invoice', 'client', 'user']);

            $auditService->log(
                $orgId,
                $user?->id,
                'payment_created',
                $freshPayment,
                $freshPayment->id,
                null,
                $freshPayment->toArray()
            );

            return $freshPayment;
        });

        $allocatedAmount = round((float) $payment->amount - (float) $payment->unallocated_amount, 2);

        return response()->json([
            'payment'            => $payment,
            'allocated_amount'   => $allocatedAmount,
            'unallocated_amount' => (float) $payment->unallocated_amount,
            'allocations'        => $payment->allocations,
        ], 201);
    }

    public function allocatePayment(int $paymentId, Request $request, PaymentFifoService $fifoService, AuditLogService $auditService): JsonResponse
    {
        $role = $request->attributes->get('active_role');
        if ($role === 'auditor') {
            return response()->json(['message' => 'Auditors are not permitted to allocate payments.'], 403);
        }

        $request->validate([
            'invoice_id' => 'required|integer',
            'amount'     => 'required|numeric|gt:0',
        ]);

        $orgId = $request->attributes->get('active_organization_id');
        $user = $request->user();

        $payment = Payment::where('organization_id', $orgId)->find($paymentId);
        if (!$payment) {
            return response()->json(['message' => 'Payment not found in this organization.'], 404);
        }

        $invoice = Invoice::where('organization_id', $orgId)->find($request->invoice_id);
        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found in this organization.'], 404);
        }

        if ($invoice->client_id !== $payment->client_id) {
            return response()->json(['message' => 'Payment and invoice must belong to the same client.'], 403);
        }

        if ($invoice->status !== 'finalized' || $invoice->document_type !== 'invoice') {
            return response()->json(['message' => 'Only finalized Tax Invoices can receive payment allocations.'], 422);
        }

        try {
            $allocationResult = DB::transaction(function () use ($payment, $invoice, $request, $orgId, $user, $fifoService, $auditService) {
                $result = $fifoService->allocateManually($payment, $invoice, (float) $request->amount);

                $auditService->log(
                    $orgId,
                    $user?->id,
                    'payment_allocated',
                    $payment,
                    $payment->id,
                    null,
                    $result
                );

                return $result;
            });

            return response()->json([
                'payment'                    => $payment->fresh(),
                'allocation_created'         => $allocationResult,
                'total_allocated'            => $allocationResult['total_allocated'],
                'unallocated_amount'         => $allocationResult['unallocated_amount'],
                'invoice_outstanding_amount' => $allocationResult['invoice_outstanding_amount'],
            ], 200);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}