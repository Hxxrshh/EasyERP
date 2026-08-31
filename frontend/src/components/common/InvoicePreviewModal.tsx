import React, { useState, useEffect } from 'react';
import { downloadFile } from '../../utils/downloadFile';
import { getBaseUrl } from '../../services/apiClient';
import { LoadingSpinner } from './LoadingSpinner';
import { Button } from '../ui/Button';
import { Printer, Download, X, Eye } from 'lucide-react';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  invoiceId: number | null;
  initialTemplateKey?: string;
  isFinalized?: boolean;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  invoiceId,
  initialTemplateKey,
  isFinalized = false,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplateKey || 'gst_classic');
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [htmlError, setHtmlError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTemplateKey) {
      setSelectedTemplate(initialTemplateKey);
    }
  }, [initialTemplateKey, invoiceId]);

  const fetchPreviewHtml = React.useCallback(async () => {
    if (!invoiceId) return;
    setIsLoadingHtml(true);
    setHtmlError(null);

    const token = localStorage.getItem('auth_token');
    const orgId = localStorage.getItem('active_organization_id');

    try {
      const url = `${getBaseUrl()}/invoices/${invoiceId}/preview${selectedTemplate ? `?template_key=${selectedTemplate}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'text/html',
          'Authorization': `Bearer ${token}`,
          'X-Organization-Id': orgId || '',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ message: 'Failed to load invoice preview.' }));
        throw new Error(errJson.message || `Preview request failed with HTTP ${res.status}`);
      }

      const htmlText = await res.text();
      setPreviewHtml(htmlText);
    } catch (err: any) {
      setHtmlError(err.message || 'Failed to load document preview.');
    } finally {
      setIsLoadingHtml(false);
    }
  }, [invoiceId, selectedTemplate]);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchPreviewHtml();
    }
  }, [isOpen, invoiceId, fetchPreviewHtml]);

  if (!isOpen || !invoiceId) return null;

  const pdfUrl = `${getBaseUrl()}/invoices/${invoiceId}/pdf${selectedTemplate ? `?template_key=${selectedTemplate}` : ''}`;

  const handleDownloadPdf = async () => {
    setIsPdfDownloading(true);
    try {
      await downloadFile(pdfUrl, `Invoice_${invoiceId}.pdf`);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById('invoice-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-4xl w-full h-[90vh] rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col animate-pop-in">
        {/* Modal Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">
              Document Preview & Print (Doc #{invoiceId})
            </h3>
          </div>

          <div className="flex items-center space-x-3">
            {!isFinalized && (
              <div className="min-w-[170px]">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="text-xs font-bold p-1.5 border border-stone-700 rounded-xl bg-stone-800 text-white focus:outline-none"
                >
                  <option value="gst_classic">GST Classic</option>
                  <option value="gst_modern">GST Modern</option>
                  <option value="gst_detailed">GST Detailed</option>
                  <option value="gst_corporate">GST Corporate</option>
                  <option value="non_gst_classic">Non-GST Classic</option>
                  <option value="non_gst_modern">Non-GST Modern</option>
                </select>
              </div>
            )}

            <Button variant="ghost" onClick={handlePrint} icon={<Printer className="w-4 h-4" />} className="text-white hover:bg-stone-800 border-stone-700">
              Print
            </Button>

            <Button variant="primary" onClick={handleDownloadPdf} isLoading={isPdfDownloading} icon={<Download className="w-4 h-4 text-stone-950" />}>
              Download PDF
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Frame */}
        <div className="flex-1 bg-stone-200/70 p-6 overflow-auto flex justify-center">
          {isLoadingHtml ? (
            <LoadingSpinner label="Rendering full document preview..." />
          ) : htmlError ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 font-bold text-xs text-center">
              {htmlError}
            </div>
          ) : (
            <iframe
              id="invoice-preview-iframe"
              srcDoc={previewHtml || ''}
              title={`Invoice Preview #${invoiceId}`}
              className="w-full max-w-3xl h-full border border-stone-300 rounded-2xl bg-white shadow-2xl"
            />
          )}
        </div>
      </div>
    </div>
  );
};
