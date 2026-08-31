import React, { useState } from 'react';
import { useInvoicesQuery, useCancelInvoiceMutation, useConvertDocumentMutation } from '../../hooks/useApiQueries';
import { downloadFile } from '../../utils/downloadFile';
import { uiEventBus } from '../../services/uiEventBus';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Badge } from '../ui/Badge';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { RequestCorrectionModal } from '../billing/RequestCorrectionModal';
import { InvoicePreviewModal } from '../common/InvoicePreviewModal';
import { PrepareDeliveryModal } from '../common/PrepareDeliveryModal';
import {
  Search,
  Eye,
  Download,
  Ban,
  ArrowRightLeft,
  Mail,
  History,
  FileText,
} from 'lucide-react';
import type { Invoice, DocumentType } from '../../types';
import { getBaseUrl } from '../../services/apiClient';

export const DocumentsWorkspace: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [correctionModalInvoice, setCorrectionModalInvoice] = useState<Invoice | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);
  const [deliveryInvoiceId, setDeliveryInvoiceId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const { data: invoicesData, isLoading, error } = useInvoicesQuery({
    document_type: selectedType !== 'all' ? selectedType : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  });

  const cancelMutation = useCancelInvoiceMutation();
  const convertMutation = useConvertDocumentMutation();

  if (isLoading) {
    return <LoadingSpinner label="Loading documents lifecycle registry..." />;
  }

  const invoices = invoicesData?.data || [];
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const invNum = (inv.invoice_number || '').toLowerCase();
    const clientName = (inv.client?.name || '').toLowerCase();
    return invNum.includes(q) || clientName.includes(q);
  });

  const handleDownloadPdf = async (invoiceId: number) => {
    try {
      setExportingId(invoiceId);
      uiEventBus.emit({ type: 'EXPORT_STARTED' });
      const pdfUrl = `${getBaseUrl()}/invoices/${invoiceId}/pdf`;
      await downloadFile(pdfUrl, `Document_${invoiceId}.pdf`);
      uiEventBus.emit({ type: 'EXPORT_SUCCESS' });
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setExportingId(null);
    }
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`Are you sure you want to cancel document #${invoice.invoice_number || invoice.id}? This will reverse ledger entries.`)) {
      return;
    }
    try {
      await cancelMutation.mutateAsync(invoice.id);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel document.');
    }
  };

  const handleConvert = async (invoiceId: number, targetType: DocumentType) => {
    try {
      await convertMutation.mutateAsync({ id: invoiceId, target_type: targetType });
    } catch (err: any) {
      alert(err.message || 'Failed to convert document.');
    }
  };

  const stages = [
    { key: 'all', label: 'All Documents' },
    { key: 'quote', label: 'Quotes' },
    { key: 'proforma', label: 'Proformas' },
    { key: 'challan', label: 'Challans' },
    { key: 'invoice', label: 'Tax Invoices' },
  ];

  return (
    <div className="space-y-8">
      {/* Modals & Dialogs */}
      <DocumentDetailsModal
        isOpen={isDetailsOpen}
        invoice={selectedInvoice}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedInvoice(null);
        }}
      />

      <RequestCorrectionModal
        isOpen={Boolean(correctionModalInvoice)}
        invoice={correctionModalInvoice}
        onClose={() => setCorrectionModalInvoice(null)}
        onSuccess={() => setCorrectionModalInvoice(null)}
      />

      <InvoicePreviewModal
        isOpen={Boolean(previewInvoiceId)}
        invoiceId={previewInvoiceId}
        isFinalized={true}
        onClose={() => setPreviewInvoiceId(null)}
      />

      <PrepareDeliveryModal
        isOpen={Boolean(deliveryInvoiceId)}
        invoiceId={deliveryInvoiceId}
        onClose={() => setDeliveryInvoiceId(null)}
      />

      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              LIFECYCLE REGISTRY
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500 font-mono">
              {filteredInvoices.length} Documents Tracked
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Document Registry & Lifecycle
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Audit-sealed archive of all generated estimates, proformas, dispatch challans, and final tax invoices.
          </p>
        </div>
      </div>

      {error && <ErrorAlert title="Document Registry Error" message={(error as Error).message} />}

      {/* Filter and Search Bar */}
      <div className="bg-white/85 backdrop-blur-md p-5 rounded-3xl border border-stone-900/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {stages.map((st) => (
            <button
              key={st.key}
              onClick={() => setSelectedType(st.key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedType === st.key
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-bold p-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="finalized">Finalized & Locked</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doc # or client..."
              className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-stone-900/[0.06] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-900/[0.05]">
              <tr>
                <th className="p-4">Doc # & Type</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Taxable</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-right">Paid / Open</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredInvoices.map((inv) => {
                const totalAmt = Number(inv.total_amount);
                const paidAmt = Number(inv.paid_amount);
                const openAmt = totalAmt - paidAmt;

                return (
                  <tr key={inv.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-extrabold text-stone-900">
                        {inv.invoice_number || `Draft #${inv.id}`}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-stone-400">
                        {inv.document_type} {inv.tax_mode === 'non_taxable' && '• Non-GST'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-stone-900">{inv.client?.name || `Customer #${inv.client_id}`}</div>
                      <div className="text-stone-400 text-[10px] font-mono">{inv.client?.gst_number || 'URP'}</div>
                    </td>
                    <td className="p-4 font-mono text-stone-600">{inv.date}</td>
                    <td className="p-4 text-right font-medium text-stone-600">
                      ₹{Number(inv.subtotal).toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-extrabold text-stone-900 text-sm">
                      ₹{totalAmt.toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-bold text-stone-900">₹{paidAmt.toFixed(2)}</div>
                      {openAmt > 0 && inv.status === 'finalized' && (
                        <div className="text-rose-600 font-extrabold text-[10px]">
                          Due: ₹{openAmt.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={inv.status as any} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDetailsOpen(true);
                          }}
                          title="View Details"
                          className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setPreviewInvoiceId(inv.id)}
                          title="Preview & Print"
                          className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(inv.id)}
                          title="Download PDF"
                          disabled={exportingId === inv.id}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            exportingId === inv.id
                              ? 'text-emerald-500 bg-emerald-50 pointer-events-none'
                              : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100'
                          }`}
                        >
                          {exportingId === inv.id ? (
                            <Download className="w-4 h-4 animate-bounce" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => setDeliveryInvoiceId(inv.id)}
                          title="Prepare Email Delivery"
                          className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
                        >
                          <Mail className="w-4 h-4" />
                        </button>

                        {/* Stage Conversion Dropdown for Quotes/Proformas */}
                        {inv.status === 'finalized' && inv.document_type !== 'invoice' && (
                          <button
                            onClick={() => handleConvert(inv.id, 'invoice')}
                            title="Convert to Official Tax Invoice"
                            className="p-1.5 text-stone-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}

                        {/* Historical Correction Request Button */}
                        {inv.status === 'finalized' && (
                          <button
                            onClick={() => setCorrectionModalInvoice(inv)}
                            title="Request Historical Correction"
                            className="p-1.5 text-stone-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}

                        {inv.status === 'finalized' && (
                          <button
                            onClick={() => handleCancelInvoice(inv)}
                            title="Cancel Document & Reverse Ledger"
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-stone-400 italic">
                    No documents matched the specified filters.
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
