import React, { useState, useEffect } from 'react';
import { apiClient, getBaseUrl } from '../../services/apiClient';
import { downloadFile } from '../../utils/downloadFile';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { Mail, Download, Copy, Check, Info, X, ExternalLink } from 'lucide-react';

interface PrepareDeliveryModalProps {
  isOpen: boolean;
  invoiceId: number | null;
  onClose: () => void;
}

export const PrepareDeliveryModal: React.FC<PrepareDeliveryModalProps> = ({
  isOpen,
  invoiceId,
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchDeliveryPayload = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get<any>(`/invoices/${invoiceId}/prepare-delivery`);
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to prepare document delivery payload.');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchDeliveryPayload();
    }
  }, [isOpen, invoiceId, fetchDeliveryPayload]);

  if (!isOpen || !invoiceId) return null;

  const handleCopyBody = () => {
    if (data?.suggested_body) {
      navigator.clipboard.writeText(data.suggested_body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const pdfUrl = `${getBaseUrl()}/invoices/${invoiceId}/pdf`;
      await downloadFile(pdfUrl, data?.filename || `Invoice_${invoiceId}.pdf`);
    } catch (err) {
      console.error('Download PDF error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const mailtoUrl = data
    ? `mailto:?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.suggested_body)}`
    : '#';

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col animate-pop-in">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Mail className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">
              Prepare Client Delivery Package (Doc #{invoiceId})
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
        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner label="Preparing client delivery package..." />
          </div>
        ) : (
          <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
            {errorMsg && <ErrorAlert title="Delivery Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

            {/* Banner */}
            <div className="p-4 bg-stone-50 border border-stone-100 rounded-2xl text-stone-700 flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
              <span>
                {data?.delivery_note || 'Direct email delivery service will be connected in a later phase.'}
              </span>
            </div>

            {/* Recipient Details */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
              <div className="text-stone-400 font-extrabold uppercase text-[10px]">Recipient Customer</div>
              <div className="font-extrabold text-stone-900 text-sm">{data?.recipient?.name}</div>
              {data?.recipient?.company_name && <div className="text-stone-600 font-medium">{data.recipient.company_name}</div>}
              {data?.recipient?.phone && <div className="text-stone-500 font-mono text-[11px]">Phone: {data.recipient.phone}</div>}
            </div>

            {/* Prepared Attachment & Filename */}
            <div className="space-y-1.5">
              <label className="block text-stone-500 font-extrabold uppercase text-[10px]">Client-Ready Filename</label>
              <div className="p-3 bg-[#121316] text-[#D4F442] font-mono font-extrabold rounded-2xl flex items-center justify-between text-xs">
                <span>{data?.filename}</span>
                <Button variant="primary" size="sm" onClick={handleDownloadPdf} isLoading={isDownloading} icon={<Download className="w-3.5 h-3.5" />}>
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="block text-stone-500 font-extrabold uppercase text-[10px]">Email Subject</label>
              <input
                type="text"
                readOnly
                value={data?.subject || ''}
                className="w-full text-xs font-bold p-3 border border-stone-200 rounded-xl bg-white text-stone-900"
              />
            </div>

            {/* Suggested Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-stone-500 font-extrabold uppercase text-[10px]">Suggested Message Body</label>
                <button
                  onClick={handleCopyBody}
                  className="text-xs text-stone-900 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Body'}</span>
                </button>
              </div>
              <textarea
                rows={5}
                readOnly
                value={data?.suggested_body || ''}
                className="w-full text-xs font-mono p-3 border border-stone-200 rounded-2xl bg-stone-50 text-stone-900"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <a
                href={mailtoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-4 h-4 text-[#D4F442]" />
                <span>Open Mail Client</span>
              </a>

              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
