import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { ShieldCheck, X, Check, Ban, Clock } from 'lucide-react';

interface CorrectionsReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CorrectionsReviewDrawer: React.FC<CorrectionsReviewDrawerProps> = ({ isOpen, onClose }) => {
  const { activeRole, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [corrections, setCorrections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCorrections();
    }
  }, [isOpen]);

  const fetchCorrections = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.get<any[]>('/corrections');
      setCorrections(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load correction queue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCorrection = async (corrId: number, requestedByUserId: number) => {
    if (activeRole !== 'admin') {
      toast.error('Only Administrators can apply historical invoice corrections.');
      return;
    }

    if (requestedByUserId === user?.id) {
      toast.error('Requester self-approval is forbidden. An independent Administrator must apply corrections.');
      return;
    }

    setProcessingId(corrId);
    setErrorMsg(null);

    try {
      await apiClient.post(`/corrections/${corrId}/apply`);
      toast.success('Historical invoice correction applied successfully.');
      queryClient.invalidateQueries();
      fetchCorrections();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply correction.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectCorrection = async (corrId: number) => {
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }

    setProcessingId(corrId);
    setErrorMsg(null);

    try {
      await apiClient.post(`/corrections/${corrId}/reject`, {
        rejection_reason: rejectionReason,
      });
      toast.success('Correction request rejected.');
      setRejectingId(null);
      setRejectionReason('');
      queryClient.invalidateQueries();
      fetchCorrections();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject correction.');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex justify-end">
      <div className="bg-[#FAF9F5] max-w-2xl w-full h-full shadow-2xl border-l border-stone-900/[0.08] overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight">
              Historical Invoice Correction Audit & Review Queue
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && <ErrorAlert title="Correction Queue Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

          {isLoading ? (
            <LoadingSpinner label="Loading pending historical corrections..." />
          ) : corrections.length === 0 ? (
            <div className="py-16 text-center text-stone-500 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-stone-300" />
              <p className="font-extrabold text-sm text-stone-800">No Pending Correction Requests</p>
              <p className="text-xs text-stone-400">All historical invoice correction requests have been processed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {corrections.map((c) => {
                const isRequesterSelf = c.requested_by === user?.id;
                const isPending = c.status === 'requested' || c.status === 'approved';

                return (
                  <div
                    key={c.id}
                    className="border border-stone-900/[0.06] rounded-3xl overflow-hidden shadow-xs bg-white text-xs"
                  >
                    {/* Header bar */}
                    <div className="p-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-stone-900 font-mono text-xs">{c.correction_reference}</span>
                        <div className="text-[10px] text-stone-500">
                          Target Invoice: <strong className="text-stone-800">{c.invoice?.invoice_number || `#${c.invoice_id}`}</strong> • Requester: <strong>{c.requester?.name || 'Operator'}</strong>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          c.status === 'applied'
                            ? 'bg-emerald-500/10 text-emerald-900 border border-emerald-500/20'
                            : c.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-900 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-900 border border-amber-500/20'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-stone-400">Business Reason:</span>
                        <p className="font-medium text-stone-800 italic mt-0.5">"{c.reason}"</p>
                      </div>

                      {/* Side-by-side totals comparison */}
                      <div className="grid grid-cols-2 gap-3 bg-stone-50 p-4 border border-stone-100 rounded-2xl">
                        <div>
                          <span className="font-bold text-stone-500 uppercase text-[10px]">Original Amount</span>
                          <div className="font-extrabold text-stone-900 text-sm mt-0.5">
                            ₹{Number(c.original_snapshot?.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <span className="font-bold text-stone-700 uppercase text-[10px]">Proposed Correction</span>
                          <div className="font-extrabold text-stone-900 text-sm mt-0.5 flex items-center space-x-1">
                            <span>₹{Number(c.proposed_snapshot?.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Line Item Comparison */}
                      <div className="space-y-1.5">
                        <span className="font-bold text-stone-600 uppercase text-[10px]">Proposed Line Items:</span>
                        <div className="border border-stone-100 rounded-xl overflow-hidden bg-white">
                          <table className="w-full text-left">
                            <thead className="bg-stone-50 text-[10px] font-bold text-stone-500 border-b">
                              <tr>
                                <th className="p-2">Item</th>
                                <th className="p-2 text-center">Qty</th>
                                <th className="p-2 text-right">Rate</th>
                                <th className="p-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-[11px]">
                              {(c.proposed_snapshot?.items || []).map((pi: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="p-2 font-semibold text-stone-900">{pi.name}</td>
                                  <td className="p-2 text-center">{pi.quantity}</td>
                                  <td className="p-2 text-right">₹{pi.rate}</td>
                                  <td className="p-2 text-right font-bold text-stone-900">₹{pi.amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Actions */}
                      {isPending && activeRole === 'admin' && (
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
                          {isRequesterSelf ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                              Requester Self-Approval Restricted
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => setRejectingId(rejectingId === c.id ? null : c.id)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl flex items-center space-x-1 cursor-pointer transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>

                              <Button
                                variant="primary"
                                isLoading={processingId === c.id}
                                onClick={() => handleApplyCorrection(c.id, c.requested_by)}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Approve & Apply Correction
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Rejection Form */}
                      {rejectingId === c.id && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 animate-fade-in">
                          <label className="block text-[10px] font-bold text-rose-800 uppercase">
                            Rejection Reason *
                          </label>
                          <input
                            type="text"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason for rejecting this correction..."
                            className="w-full p-2.5 border border-rose-300 rounded-xl bg-white text-xs"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setRejectingId(null)}
                              className="px-3 py-1 text-stone-600 text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRejectCorrection(c.id)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
