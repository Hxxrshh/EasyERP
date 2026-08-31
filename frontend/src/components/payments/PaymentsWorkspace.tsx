import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  usePaymentsQuery,
  useMetaQuery,
  useInvoicesQuery,
  useRecordPaymentMutation,
  useAutoAllocateMutation,
} from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { FormInput } from '../ui/FormInput';
import { FormSelect } from '../ui/FormSelect';
import { ShortcutHint } from '../ui/ShortcutHint';
import {
  CheckCircle,
  ArrowDownRight,
  Receipt,
  Search,
} from 'lucide-react';
import type { Payment } from '../../types';

export const PaymentsWorkspace: React.FC = () => {
  const { activeRole } = useAuth();
  const { data: metaData } = useMetaQuery();
  const { data: paymentsData, isLoading, error } = usePaymentsQuery();
  const { data: openInvoicesData } = useInvoicesQuery({ status: 'finalized' });

  const recordPaymentMutation = useRecordPaymentMutation();
  const autoAllocateMutation = useAutoAllocateMutation();

  // Form State
  const [clientId, setClientId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('bank_transfer');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [floatingAmount, setFloatingAmount] = useState<number | null>(null);

  const payments = paymentsData?.data || [];
  const clients = metaData?.clients || [];

  // Filter open invoices for the selected customer to show the FIFO Preview
  const selectedClientOpenInvoices = (openInvoicesData?.data || []).filter(
    (inv) => inv.client_id === clientId && Number(inv.total_amount) > Number(inv.paid_amount)
  );

  // Calculate simulated FIFO distribution
  let remainingToAllocate = Number(amount) || 0;
  const simulatedAllocations: Array<{ invoice: any; applied: number; remainingDue: number }> = [];

  selectedClientOpenInvoices.forEach((inv) => {
    const due = Number(inv.total_amount) - Number(inv.paid_amount);
    if (remainingToAllocate > 0) {
      const apply = Math.min(remainingToAllocate, due);
      simulatedAllocations.push({
        invoice: inv,
        applied: apply,
        remainingDue: due - apply,
      });
      remainingToAllocate -= apply;
    }
  });

  const unallocatedExcess = remainingToAllocate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setActionError('Please select a customer.');
      return;
    }
    if (amount <= 0) {
      setActionError('Payment amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        client_id: Number(clientId),
        amount: Number(amount),
        payment_date: paymentDate,
        payment_mode: paymentMode,
        transaction_reference: transactionRef,
        notes: notes,
      };

      await recordPaymentMutation.mutateAsync(payload);

      setSuccessMsg(
        `Payment receipt recorded and automatically allocated across customer invoices via FIFO engine!`
      );

      // Trigger floating animation
      setFloatingAmount(Number(amount));
      setTimeout(() => setFloatingAmount(null), 3000);

      // Reset form
      setAmount(0);
      setTransactionRef('');
      setNotes('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to record payment receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualAllocate = async (paymentId: number) => {
    try {
      await autoAllocateMutation.mutateAsync(paymentId);
      setSuccessMsg('Re-ran FIFO allocation successfully.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to re-allocate payment.');
    }
  };

  const filteredPayments = payments.filter((p: Payment) => {
    const q = searchQuery.toLowerCase();
    const clientName = (p.client?.name || '').toLowerCase();
    const ref = (p.transaction_reference || '').toLowerCase();
    return clientName.includes(q) || ref.includes(q);
  });

  if (isLoading) {
    return <LoadingSpinner label="Loading payments ledger & FIFO engines..." />;
  }

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              FIFO ENGINE
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500 font-mono">
              Auto-Settlement Active
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Payments & FIFO Allocation
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Record customer payment receipts. The engine automatically reconciles open invoices chronologically (First-In, First-Out) and maintains unallocated customer credits.
          </p>
        </div>
      </div>

      {error && <ErrorAlert title="Payments Error" message={(error as Error).message} />}
      {actionError && <ErrorAlert title="Action Error" message={actionError} onDismiss={() => setActionError(null)} />}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-950 text-xs font-bold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Payment Entry Form (5 Cols) vs Live FIFO Storyboard (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Payment Entry Form */}
        <div className="lg:col-span-5 bg-white/85 backdrop-blur-md rounded-3xl p-6 lg:p-8 border border-stone-900/[0.06] shadow-xs space-y-6">
          <div>
            <h3 className="font-extrabold text-stone-900 text-base tracking-tight">
              Record Inward Receipt
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Captures cash, bank transfer, UPI or cheque receipts</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormSelect
              label="Customer Account *"
              value={clientId}
              onChange={(e) => setClientId(Number(e.target.value) || '')}
              required
            >
              <option value="">-- Choose Customer --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_name || 'Individual'})
                </option>
              ))}
            </FormSelect>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Receipt Amount (₹) *"
                type="number"
                min="0.01"
                step="any"
                required
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
              />

              <FormInput
                label="Receipt Date *"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Payment Mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="bank_transfer">Bank RTGS / NEFT / IMPS</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cash">Cash Collection</option>
                <option value="cheque">Bank Cheque</option>
              </FormSelect>

              <FormInput
                label="Transaction Ref / UTR #"
                type="text"
                placeholder="e.g. UTR12345678"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-700">Internal Ledger Note</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or cheque clearing details..."
                className="w-full text-xs font-semibold p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            {activeRole !== 'auditor' && (
              <div className="relative">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full relative overflow-hidden"
                  isLoading={isSubmitting}
                  icon={<ArrowDownRight className="w-4 h-4 text-stone-950" />}
                >
                  <span>Record Receipt & Allocate FIFO</span>
                  <ShortcutHint type="recordPayment" className="ml-1" />
                </Button>

                {/* Floating Payment Animation */}
                {floatingAmount !== null && (
                  <div className="absolute top-0 right-8 pointer-events-none animate-float-up text-emerald-500 font-extrabold text-2xl z-10 drop-shadow-md">
                    + ₹{floatingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Live FIFO Allocation Storyboard (7 Cols) */}
        <div className="lg:col-span-7 bg-[#121316] text-[#FAF9F5] rounded-3xl p-6 lg:p-8 shadow-xl border border-stone-800 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4F442]">
                  SIMULATED SETTLEMENT PREVIEW
                </span>
                <h3 className="text-lg font-extrabold text-white mt-0.5">
                  FIFO Engine Storyboard
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 font-bold block uppercase">Payment Amount</span>
                <span className="text-xl font-extrabold text-[#D4F442]">
                  ₹{Number(amount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Storyboard Progression Container */}
            {!clientId ? (
              <div className="p-8 text-center text-stone-400 text-xs italic bg-stone-900/50 rounded-2xl border border-stone-800">
                Select a customer account on the left to see live chronological FIFO allocation simulation.
              </div>
            ) : selectedClientOpenInvoices.length === 0 ? (
              <div className="p-8 text-center text-stone-300 text-xs bg-stone-900/50 rounded-2xl border border-stone-800 space-y-2">
                <p className="font-bold text-emerald-400">No overdue open invoices for this customer!</p>
                <p className="text-stone-400 text-[11px]">
                  Any receipt recorded will be safely placed in customer unallocated credit balance for future invoices.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] font-extrabold text-stone-400 uppercase tracking-wider">
                  Open Invoices ({selectedClientOpenInvoices.length}) In Order of Aging:
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {selectedClientOpenInvoices.map((inv) => {
                    const sim = simulatedAllocations.find((s) => s.invoice.id === inv.id);
                    const applied = sim ? sim.applied : 0;
                    const due = Number(inv.total_amount) - Number(inv.paid_amount);

                    return (
                      <div
                        key={inv.id}
                        className={`p-3.5 rounded-2xl border text-xs transition-all flex items-center justify-between ${
                          applied > 0
                            ? 'bg-[#D4F442]/10 border-[#D4F442]/30 text-white'
                            : 'bg-stone-900/40 border-stone-800 text-stone-400'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-white">
                              {inv.invoice_number || `Draft #${inv.id}`}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">({inv.date})</span>
                          </div>
                          <div className="text-[11px] text-stone-400">
                            Total: ₹{Number(inv.total_amount).toFixed(2)} • Due: ₹{due.toFixed(2)}
                          </div>
                        </div>

                        <div className="text-right">
                          {applied > 0 ? (
                            <div>
                              <span className="text-[10px] text-[#D4F442] font-extrabold uppercase block">
                                Applied via FIFO
                              </span>
                              <span className="text-sm font-extrabold text-white">
                                ₹{applied.toFixed(2)}
                              </span>
                              {sim && sim.remainingDue === 0 && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full ml-1">
                                  Full Settle
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-500 font-bold">Pending next receipt</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Allocation Outcome Footer */}
          {clientId && (
            <div className="pt-4 border-t border-stone-800 flex items-center justify-between text-xs">
              <div className="text-stone-400">
                Excess / Unallocated Advance Credit:
              </div>
              <div className={`font-extrabold ${unallocatedExcess > 0 ? 'text-[#D4F442]' : 'text-stone-400'}`}>
                ₹{unallocatedExcess.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Payments Registry Table */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-stone-900/[0.06] shadow-xs overflow-hidden space-y-4 p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-stone-900 text-base tracking-tight flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-stone-700" />
              <span>Historical Payment Receipts ({payments.length})</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Authoritative record of all inward receipts and FIFO allocations</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer or UTR..."
              className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-stone-900/[0.06] rounded-2xl bg-white">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-900/[0.05]">
              <tr>
                <th className="p-3.5">Payment Date</th>
                <th className="p-3.5">Customer Name</th>
                <th className="p-3.5">Payment Mode</th>
                <th className="p-3.5">Reference / UTR</th>
                <th className="p-3.5 text-right">Amount (₹)</th>
                <th className="p-3.5 text-right">Unallocated (₹)</th>
                <th className="p-3.5 text-center">Allocations</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredPayments.map((p: Payment) => {
                const totalAmt = Number(p.amount);
                const unalloc = Number(p.unallocated_amount);
                const allocCount = p.allocations?.length || 0;

                return (
                  <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-3.5 font-mono text-stone-600">{p.payment_date}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-stone-900">{p.client?.name || `Client #${p.client_id}`}</div>
                    </td>
                    <td className="p-3.5 uppercase font-bold text-[10px] text-stone-500">
                      {p.payment_mode.replace('_', ' ')}
                    </td>
                    <td className="p-3.5 font-mono text-stone-800">{p.transaction_reference || '—'}</td>
                    <td className="p-3.5 text-right font-extrabold text-[#1E5E41] text-sm">
                      ₹{totalAmt.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right">
                      {unalloc > 0 ? (
                        <span className="font-bold text-amber-700">₹{unalloc.toFixed(2)}</span>
                      ) : (
                        <span className="text-stone-400">₹0.00</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-stone-100 text-stone-700 font-bold rounded-full text-[10px]">
                        {allocCount} Invoices
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {unalloc > 0 && activeRole !== 'auditor' && (
                        <button
                          onClick={() => handleManualAllocate(p.id)}
                          className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-[#D4F442] font-bold rounded-xl text-[10px] cursor-pointer transition-colors"
                        >
                          Re-Run FIFO
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-stone-400 italic">
                    No payment receipts matched your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
