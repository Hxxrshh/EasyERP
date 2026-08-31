import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../common/ErrorAlert';
import { Layout, X, Info } from 'lucide-react';

interface ClientTemplateConfigModalProps {
  isOpen: boolean;
  clientId: number | null;
  clientName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ClientTemplateConfigModal: React.FC<ClientTemplateConfigModalProps> = ({
  isOpen,
  clientId,
  clientName = 'Customer',
  onClose,
  onSuccess,
}) => {
  const { activeRole } = useAuth();
  const toast = useToast();

  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [configuredTemplates, setConfiguredTemplates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchWarehouseAndConfig = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const catalogRes = await apiClient.get<any>('/templates');
      setAvailableTemplates(catalogRes.available_templates || []);

      const clientRes = await apiClient.get<any>(`/clients/${clientId}/templates`);
      const map: Record<string, string> = {};
      (clientRes.templates || []).forEach((t: any) => {
        const comboKey = `${t.document_type}_${t.tax_mode}`;
        map[comboKey] = t.template_key;
      });
      setConfiguredTemplates(map);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load client template configuration.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchWarehouseAndConfig();
    }
  }, [isOpen, clientId, fetchWarehouseAndConfig]);

  if (!isOpen || !clientId) return null;

  const handleSaveConfig = async (docType: string, taxMode: string, templateKey: string) => {
    setErrorMsg(null);
    setIsSaving(true);
    try {
      if (!templateKey) {
        await apiClient.delete(`/clients/${clientId}/templates?document_type=${docType}&tax_mode=${taxMode}`);
        toast.success(`Reset ${docType} template to organization default.`);
      } else {
        await apiClient.post(`/clients/${clientId}/templates`, {
          document_type: docType,
          tax_mode: taxMode,
          template_key: templateKey,
        });
        toast.success(`Updated ${docType} (${taxMode}) template configuration for ${clientName}.`);
      }

      fetchWarehouseAndConfig();
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update client template setting.');
    } finally {
      setIsSaving(false);
    }
  };

  const gstTemplates = availableTemplates.filter((t) => t.category === 'GST');
  const nonGstTemplates = availableTemplates.filter((t) => t.category === 'Non-GST');
  const quoteTemplates = availableTemplates.filter((t) => t.category === 'Quote');
  const proformaTemplates = availableTemplates.filter((t) => t.category === 'Proforma');
  const challanTemplates = availableTemplates.filter((t) => t.category === 'Challan');

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col max-h-[85vh] animate-pop-in">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Layout className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight text-white">
              Document Templates Configuration — {clientName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner label="Loading customer document templates..." />
          </div>
        ) : (
          <div className="p-6 space-y-4 text-xs overflow-y-auto">
            {errorMsg && <ErrorAlert title="Template Config Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-stone-700 flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
              <span>
                Configure distinct document templates for <strong>{clientName}</strong> across different document types & tax modes. Unset choices automatically fallback to organization defaults.
              </span>
            </div>

            {/* Config Rows */}
            <div className="space-y-3">
              {/* 1. Taxable GST Invoice */}
              <div className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-2xl space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">Taxable GST Invoice Template</label>
                <select
                  disabled={activeRole === 'auditor' || isSaving}
                  value={configuredTemplates['invoice_taxable'] || ''}
                  onChange={(e) => handleSaveConfig('invoice', 'taxable', e.target.value)}
                  className="w-full text-xs font-bold p-2 border border-stone-200 rounded-xl bg-white text-stone-900"
                >
                  <option value="">-- Use Organization Default --</option>
                  {gstTemplates.map((t) => (
                    <option key={t.key} value={t.key}>{t.name} ({t.version})</option>
                  ))}
                </select>
              </div>

              {/* 2. Non-Taxable Bill */}
              <div className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-2xl space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">Non-Taxable Commercial Bill Template</label>
                <select
                  disabled={activeRole === 'auditor' || isSaving}
                  value={configuredTemplates['invoice_non_taxable'] || ''}
                  onChange={(e) => handleSaveConfig('invoice', 'non_taxable', e.target.value)}
                  className="w-full text-xs font-bold p-2 border border-stone-200 rounded-xl bg-white text-stone-900"
                >
                  <option value="">-- Use Organization Default --</option>
                  {nonGstTemplates.map((t) => (
                    <option key={t.key} value={t.key}>{t.name} ({t.version})</option>
                  ))}
                </select>
              </div>

              {/* 3. Quote / Estimate */}
              <div className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-2xl space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">Quote / Estimate Template</label>
                <select
                  disabled={activeRole === 'auditor' || isSaving}
                  value={configuredTemplates['quote_taxable'] || configuredTemplates['quote_non_taxable'] || ''}
                  onChange={(e) => handleSaveConfig('quote', 'taxable', e.target.value)}
                  className="w-full text-xs font-bold p-2 border border-stone-200 rounded-xl bg-white text-stone-900"
                >
                  <option value="">-- Use Organization Default --</option>
                  {quoteTemplates.map((t) => (
                    <option key={t.key} value={t.key}>{t.name} ({t.version})</option>
                  ))}
                </select>
              </div>

              {/* 4. Proforma Invoice */}
              <div className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-2xl space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">Proforma Invoice Template</label>
                <select
                  disabled={activeRole === 'auditor' || isSaving}
                  value={configuredTemplates['proforma_taxable'] || configuredTemplates['proforma_non_taxable'] || ''}
                  onChange={(e) => handleSaveConfig('proforma', 'taxable', e.target.value)}
                  className="w-full text-xs font-bold p-2 border border-stone-200 rounded-xl bg-white text-stone-900"
                >
                  <option value="">-- Use Organization Default --</option>
                  {proformaTemplates.map((t) => (
                    <option key={t.key} value={t.key}>{t.name} ({t.version})</option>
                  ))}
                </select>
              </div>

              {/* 5. Delivery Challan */}
              <div className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-2xl space-y-1.5">
                <label className="font-bold text-stone-800 text-xs block">Delivery Challan Template</label>
                <select
                  disabled={activeRole === 'auditor' || isSaving}
                  value={configuredTemplates['challan_taxable'] || configuredTemplates['challan_non_taxable'] || ''}
                  onChange={(e) => handleSaveConfig('challan', 'taxable', e.target.value)}
                  className="w-full text-xs font-bold p-2 border border-stone-200 rounded-xl bg-white text-stone-900"
                >
                  <option value="">-- Use Organization Default --</option>
                  {challanTemplates.map((t) => (
                    <option key={t.key} value={t.key}>{t.name} ({t.version})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
              <Button variant="ghost" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
