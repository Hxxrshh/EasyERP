import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMetaQuery, useRecordPaymentMutation, useAllocatePaymentMutation, useInvoicesQuery } from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { CreditCard, CheckCircle, AlertCircle, PlusCircle, Lock } from 'lucide-react';

export const PaymentsWorkspace: React.FC = () => {
  const { activeRole } = useAuth();
  const { data: metaData, isLoading: isMetaLoading } = useMetaQuery();
  const { data: invoicesData } = useInvoicesQuery({ status: 'finalized', document_type: 'invoice' });

  const recordPaymentMutation = useRecordPaymentMutation();
  const allocatePaymentMutation = useAllocatePaymentMutation();

  const [clientId, setClientId] = useState<number | ''>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [recordedPaymentResult, setRecordedPaymentResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual Allocation Modal State
  const [showAllocateModal, setShowAllocateModal] = useState<boolean>(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | ''>('');
  const [allocateAmount, setAllocateAmount] = useState<string>('');

  if (isMetaLoading) {
    return <LoadingSpinner label="Loading payments master metadata..." />;
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !amount || Number(amount) <= 0) {
      setErrorMsg('Please select a client and enter a valid positive payment amount.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await recordPaymentMutation.mutateAsync({
        client_id: Number(clientId),
        amount: Number(amount),
        payment_date: paymentDate,
        payment_mode: paymentMode,
        transaction_reference: transactionRef,
        notes: notes,
      });

      setRecordedPaymentResult(result);
      setSuccessMsg(`Payment of ₹${result.payment.amount} recorded successfully! FIFO allocated ₹${result.allocated_amount}. Unallocated: ₹${result.unallocated_amount}.`);
      setAmount('');
      setTransactionRef('');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record payment.');
    }
  };

  const handleManualAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedPaymentResult?.payment?.id || !selectedInvoiceId || !allocateAmount || Number(allocateAmount) <= 0) {
      setErrorMsg('Please select an invoice and enter a valid allocation amount.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await allocatePaymentMutation.mutateAsync({
        paymentId: recordedPaymentResult.payment.id,
        invoice_id: Number(selectedInvoiceId),
        amount: Number(allocateAmount),
      });

      setSuccessMsg(`Manually allocated ₹${allocateAmount} to invoice ${res.allocation_created.invoice_id}. Remaining unallocated: ₹${res.unallocated_amount}.`);
      setRecordedPaymentResult((prev: any) => ({
        ...prev,
        payment: res.payment,
        unallocated_amount: res.unallocated_amount,
        allocated_amount: res.total_allocated,
      }));
      setShowAllocateModal(false);
      setAllocateAmount('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to manually allocate payment.');
    }
  };

  // Filter finalized invoices for selected client
  const clientInvoices = (invoicesData?.data || []).filter(
    (i) => i.client_id === Number(clientId) && i.total_amount - i.paid_amount > 0
  );

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Payment Recording & FIFO Allocation</h2>
          <p className="text-xs text-slate-500 mt-0.5">Record incoming customer payments. Automatic FIFO allocation applies against oldest unpaid finalized invoices.</p>
        </div>
      </div>

      {errorMsg && <ErrorAlert title="Payment Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Form & Result Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Recording Form */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Record New Payment</span>
          </h3>

          {activeRole === 'auditor' ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Auditor role is read-only. Payment recording is disabled.</span>
            </div>
          ) : (
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Customer / Client</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(Number(e.target.value) || '')}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Customer --</option>
                  {metaData?.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company_name || c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Payment Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Transaction Reference</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UTR99882211"
                    className="w-full text-xs font-medium p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Notes / Remarks</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional payment notes"
                  className="w-full text-xs font-medium p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={recordPaymentMutation.isPending}
                className="w-full"
              >
                {recordPaymentMutation.isPending ? 'Processing Payment & Allocating...' : 'Submit Payment & Run FIFO Allocation'}
              </Button>
            </form>
          )}
        </div>

        {/* Allocation Summary Box */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Last Payment Allocation Breakdown</h3>

          {recordedPaymentResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Payment Total</div>
                  <div className="text-lg font-extrabold text-slate-900">₹{recordedPaymentResult.payment.amount}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-emerald-600">FIFO Allocated</div>
                  <div className="text-lg font-extrabold text-emerald-700">₹{recordedPaymentResult.allocated_amount}</div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-[10px] uppercase font-bold text-amber-600">Unallocated</div>
                  <div className="text-lg font-extrabold text-amber-700">₹{recordedPaymentResult.unallocated_amount}</div>
                </div>
              </div>

              {recordedPaymentResult.unallocated_amount > 0 && activeRole !== 'auditor' && (
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div className="text-xs text-amber-900 font-medium flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Unallocated balance of ₹{recordedPaymentResult.unallocated_amount} available for manual allocation.</span>
                  </div>
                  <button
                    onClick={() => setShowAllocateModal(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Manually Allocate</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Submit a payment on the left to view instant FIFO allocation details.
            </div>
          )}
        </div>
      </div>

      {/* Manual Allocation Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Manual Payment Allocation</h3>
            <p className="text-xs text-slate-500">
              Manually assign unallocated payment balance (Available: <strong className="text-amber-700">₹{recordedPaymentResult?.unallocated_amount}</strong>) to an open invoice.
            </p>

            <form onSubmit={handleManualAllocate} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Select Finalized Invoice</label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(Number(e.target.value) || '')}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                >
                  <option value="">-- Select Open Invoice --</option>
                  {clientInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      Inv #{inv.invoice_number} (Outstanding: ₹{(inv.total_amount - inv.paid_amount).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Allocation Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={recordedPaymentResult?.unallocated_amount}
                  required
                  value={allocateAmount}
                  onChange={(e) => setAllocateAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocatePaymentMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  {allocatePaymentMutation.isPending ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
