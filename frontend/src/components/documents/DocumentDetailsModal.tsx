import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import type { Invoice, AuditLog } from '../../types';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Button } from '../ui/Button';
import { FileText, Clock, X, ShieldCheck } from 'lucide-react';

interface DocumentDetailsModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
}

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  isOpen,
  invoice,
  onClose,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchAuditHistory = React.useCallback(async (id: number) => {
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.get<any>(`/audit-logs?entity_type=App\\Models\\Invoice`);
      const logs = res.data || [];
      const invoiceLogs = logs.filter((log: AuditLog) => log.auditable_id === id);
      setAuditLogs(invoiceLogs);
    } catch {
      setAuditLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && invoice?.id) {
      fetchAuditHistory(invoice.id);
    }
  }, [isOpen, invoice, fetchAuditHistory]);

  if (!isOpen || !invoice) return null;

  const totalAmount = Number(invoice.total_amount);
  const paidAmount = Number(invoice.paid_amount);
  const outstanding = totalAmount - paidAmount;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col max-h-[90vh] animate-pop-in">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">
              Document Dossier (#{invoice.invoice_number || 'Draft'})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-xs overflow-y-auto">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100 space-y-1">
              <div className="text-[10px] text-stone-400 font-extrabold uppercase">Type</div>
              <div className="font-extrabold text-stone-900 uppercase">{invoice.document_type}</div>
            </div>
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100 space-y-1">
              <div className="text-[10px] text-stone-400 font-extrabold uppercase">Tax Mode</div>
              <div className="font-extrabold text-stone-900 capitalize">{invoice.tax_mode || 'taxable'}</div>
            </div>
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100 space-y-1">
              <div className="text-[10px] text-stone-400 font-extrabold uppercase">Template</div>
              <div className="font-bold text-stone-800">{invoice.template_key || 'gst_classic'}</div>
            </div>
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100 space-y-1">
              <div className="text-[10px] text-stone-400 font-extrabold uppercase">Status</div>
              <div><Badge variant={invoice.status as any} /></div>
            </div>
          </div>

          {/* Party Details & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-1">
              <div className="text-[10px] font-extrabold text-stone-400 uppercase">Customer Profile</div>
              <div className="font-extrabold text-stone-900 text-sm">{invoice.client?.name}</div>
              {invoice.client?.company_name && <div className="font-medium text-stone-600">{invoice.client.company_name}</div>}
              <div className="text-stone-500 font-mono text-[11px] pt-1">
                GSTIN: <strong className="text-stone-900">{invoice.client?.gst_number || 'URP'}</strong>
              </div>
              <div className="text-stone-500 text-[11px]">State: <strong className="text-stone-900">{invoice.client?.state}</strong></div>
            </div>

            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 space-y-2">
              <div className="text-[10px] font-extrabold text-stone-400 uppercase">Financial Breakdown</div>
              <div className="flex justify-between">
                <span className="text-stone-500">Taxable Subtotal:</span>
                <span className="font-bold text-stone-900">₹{Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Total GST Amount:</span>
                <span className="font-bold text-stone-900">₹{Number(invoice.total_gst).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-stone-900 border-t border-stone-200 pt-1.5 text-sm">
                <span>Grand Total:</span>
                <span className="text-[#1E5E41]">₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-500 text-[11px]">
                <span>Paid / Open:</span>
                <span className="font-bold">
                  ₹{paidAmount.toFixed(2)} / <strong className="text-rose-600">₹{outstanding.toFixed(2)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          {invoice.items && invoice.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                Line Items ({invoice.items.length})
              </h4>
              <div className="border border-stone-100 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] border-b border-stone-100">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-center">GST %</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-semibold text-stone-900">{item.product?.name || `Product #${item.product_id}`}</td>
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-right font-medium">₹{item.rate}</td>
                        <td className="p-3 text-center font-medium">{item.gst_rate}%</td>
                        <td className="p-3 text-right font-extrabold text-stone-900">₹{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Activity Timeline Audit History */}
          <div className="space-y-2 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-stone-900 text-xs flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-stone-600" />
                <span>Authoritative Audit Timeline</span>
              </h4>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Forensic History</span>
            </div>

            {isLoadingLogs ? (
              <LoadingSpinner label="Loading audit history..." />
            ) : auditLogs.length > 0 ? (
              <div className="space-y-2 border border-stone-100 rounded-2xl p-4 bg-stone-50">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-2.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-900 capitalize">{log.action.replace('_', ' ')}</span>
                      <span className="text-stone-500"> by </span>
                      <strong className="text-stone-800">{log.user?.name || 'System'}</strong>
                      <span className="text-stone-400"> on {log.created_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-stone-50 border border-stone-100 rounded-2xl text-stone-400 italic text-center">
                No recorded audit entries for this document yet.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
