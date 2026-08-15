import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInvoicesQuery, useConvertDocumentMutation, useCancelInvoiceMutation } from '../../hooks/useApiQueries';
import type { DocumentType } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ArrowRight, Ban, CheckCircle } from 'lucide-react';

export const DocumentsWorkspace: React.FC = () => {
  const { activeRole } = useAuth();
  const [docTypeFilter, setDocTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: invoicesData, isLoading, error } = useInvoicesQuery({
    document_type: docTypeFilter || undefined,
    status: statusFilter || undefined,
  });

  const convertMutation = useConvertDocumentMutation();
  const cancelMutation = useCancelInvoiceMutation();

  const [convertDocId, setConvertDocId] = useState<number | null>(null);
  const [targetType, setTargetType] = useState<DocumentType>('invoice');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingSpinner label="Loading document lifecycle registry..." />;
  }

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertDocId) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const converted = await convertMutation.mutateAsync({
        id: convertDocId,
        target_type: targetType,
      });

      setSuccessMsg(`Document converted successfully to ${converted.document_type.toUpperCase()}!`);
      setConvertDocId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to convert document.');
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this document? Finalized invoice numbers will remain preserved.')) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cancelled = await cancelMutation.mutateAsync(id);
      setSuccessMsg(`Document ${cancelled.invoice_number || cancelled.id} cancelled successfully.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel document.');
    }
  };

  const documents = invoicesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Document Lifecycle Manager ({invoicesData?.total || 0})</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage Quotes, Proforma Invoices, Delivery Challans, and Tax Invoices lifecycle transitions.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
          >
            <option value="">All Document Types</option>
            <option value="quote">Quotes</option>
            <option value="proforma">Proforma Invoices</option>
            <option value="challan">Delivery Challans</option>
            <option value="invoice">Tax Invoices</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="finalized">Finalized</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {errorMsg && <ErrorAlert title="Lifecycle Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}
      {error && <ErrorAlert title="Query Error" message={(error as Error).message} />}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Doc #</th>
                <th className="p-3">Type</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Grand Total (₹)</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="p-3 font-extrabold text-slate-900">{doc.invoice_number || 'Draft'}</td>
                  <td className="p-3 font-bold uppercase text-slate-600">{doc.document_type}</td>
                  <td className="p-3 font-medium text-slate-800">{doc.client?.name || `Customer #${doc.client_id}`}</td>
                  <td className="p-3">{doc.date}</td>
                  <td className="p-3 text-right font-extrabold text-slate-900">₹{Number(doc.total_amount).toFixed(2)}</td>
                  <td className="p-3">
                    <Badge variant={doc.status as any} />
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {doc.status !== 'cancelled' && doc.document_type !== 'invoice' && activeRole !== 'auditor' && (
                        <button
                          onClick={() => setConvertDocId(doc.id)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Convert</span>
                        </button>
                      )}

                      {doc.status !== 'cancelled' && activeRole !== 'auditor' && (
                        <button
                          onClick={() => handleCancel(doc.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                    No documents found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversion Modal */}
      {convertDocId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Convert Document</h3>
            <p className="text-xs text-slate-500">
              Convert document #{convertDocId} into a downstream document type.
            </p>

            <form onSubmit={handleConvert} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Target Document Type</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as DocumentType)}
                  className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                >
                  <option value="proforma">Proforma Invoice</option>
                  <option value="challan">Delivery Challan</option>
                  <option value="invoice">Official Tax Invoice</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <Button variant="ghost" type="button" onClick={() => setConvertDocId(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={convertMutation.isPending}>
                  Confirm Conversion
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
