import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBillingStore, type DraftLineItem } from '../../store/useBillingStore';
import {
  useMetaQuery,
  useCreateInvoiceMutation,
  useFinalizeInvoiceMutation,
} from '../../hooks/useApiQueries';
import { apiClient } from '../../services/apiClient';
import type { PriceResolveResponse, TemplateResolveResponse } from '../../types';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { InvoicePreviewModal } from '../common/InvoicePreviewModal';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';
import { FormInput } from '../ui/FormInput';
import { ShortcutHint } from '../ui/ShortcutHint';
import {
  Plus,
  Trash2,
  CheckCircle,
  FileCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Lock,
  Eye,
  Layout,
} from 'lucide-react';

export const BillingWorkspace: React.FC = () => {
  const { activeOrganization, activeRole } = useAuth();
  const {
    selectedClientId,
    setSelectedClientId,
    selectedDocumentType,
    setSelectedDocumentType,
    taxMode,
    setTaxMode,
    draftItems,
    setDraftItems,
    addDraftItem,
    removeDraftItem,
    clearDraft,
    setWhatsAppDrawerOpen,
  } = useBillingStore();

  const { data: metaData, isLoading: isMetaLoading } = useMetaQuery();
  const createInvoiceMutation = useCreateInvoiceMutation();
  const finalizeInvoiceMutation = useFinalizeInvoiceMutation();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState<boolean>(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showStampAnimation, setShowStampAnimation] = useState(false);

  const [resolvedTemplateKey, setResolvedTemplateKey] = useState<string>('gst_classic');
  const [templateSourceLabel, setTemplateSourceLabel] = useState<string>('Organization default');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  useEffect(() => {
    resolveTemplate(selectedClientId, taxMode, selectedDocumentType);
  }, [selectedClientId, taxMode, selectedDocumentType]);

  const resolveTemplate = async (clientId: number | null, mode: 'taxable' | 'non_taxable', docType: string) => {
    try {
      const res = await apiClient.get<TemplateResolveResponse>(
        `/templates/resolve?${clientId ? `client_id=${clientId}&` : ''}tax_mode=${mode}&document_type=${docType}`
      );
      setResolvedTemplateKey(res.template_key);
      setTemplateSourceLabel(res.source_label);
    } catch {
      setResolvedTemplateKey(mode === 'non_taxable' ? 'non_gst_classic' : 'gst_classic');
      setTemplateSourceLabel('System fallback');
    }
  };

  const resolvePriceForItem = async (
    clientId: number,
    productId: number
  ): Promise<{ rate: number; sourceLabel: string }> => {
    try {
      const res = await apiClient.get<PriceResolveResponse>(
        `/price-resolve?client_id=${clientId}&product_id=${productId}`
      );
      return { rate: Number(res.resolved_rate), sourceLabel: res.source_label };
    } catch {
      const prod = metaData?.products.find((p) => p.id === productId);
      const base = prod ? Number(prod.base_price) : 0;
      return { rate: base, sourceLabel: `Base price · ₹${base}` };
    }
  };

  const handleClientChange = async (newClientId: number | null) => {
    setSelectedClientId(newClientId);

    if (!newClientId) {
      const resetItems = draftItems.map((item) => ({ ...item, price_source_label: undefined }));
      setDraftItems(resetItems);
      return;
    }

    if (draftItems.length > 0) {
      const updatedItems = await Promise.all(
        draftItems.map(async (item) => {
          const res = await resolvePriceForItem(newClientId, item.product_id);
          return {
            ...item,
            rate: res.rate,
            price_source_label: res.sourceLabel,
          };
        })
      );
      setDraftItems(updatedItems);
    }
  };

  const handleProductChange = async (index: number, productId: number) => {
    const prod = metaData?.products.find((p) => p.id === productId);
    if (!prod) return;

    let resolvedRate = Number(prod.base_price);
    let sourceLabel = `Base price · ₹${resolvedRate}`;

    if (selectedClientId) {
      const res = await resolvePriceForItem(selectedClientId, productId);
      resolvedRate = res.rate;
      sourceLabel = res.sourceLabel;
    }

    const newItems = [...draftItems];
    newItems[index] = {
      ...newItems[index],
      product_id: prod.id,
      rate: resolvedRate,
      gst_rate: taxMode === 'non_taxable' ? 0 : Number(prod.default_gst_rate),
      price_source_label: sourceLabel,
    };
    setDraftItems(newItems);
  };

  const handleSaveDraft = async () => {
    if (!selectedClientId) {
      setErrorMsg('Please select a customer before saving.');
      return;
    }

    setErrorMsg(null);
    setSuccessMessage(null);

    try {
      const invoice = await createInvoiceMutation.mutateAsync({
        client_id: selectedClientId,
        document_type: selectedDocumentType,
        tax_mode: taxMode,
        template_key: resolvedTemplateKey,
        date: date,
        items: draftItems,
      });

      setCreatedInvoiceId(invoice.id);
      setSuccessMessage(
        `Draft ${taxMode === 'non_taxable' ? 'Non-Taxable ' : ''}${selectedDocumentType.toUpperCase()} created successfully!`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create invoice draft.');
    }
  };

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onToggleParser: () => setWhatsAppDrawerOpen(true),
    onSaveDraft: () => handleSaveDraft(),
    onAddLineItem: () => {
      if (metaData?.products && metaData.products.length > 0) {
        const firstProd = metaData.products[0];
        addDraftItem({
          product_id: firstProd.id,
          quantity: 1,
          rate: Number(firstProd.base_price),
          gst_rate: taxMode === 'non_taxable' ? 0 : Number(firstProd.default_gst_rate),
          price_source_label: `Base price · ₹${firstProd.base_price}`,
        });
      }
    },
  });

  if (isMetaLoading) {
    return <LoadingSpinner label="Loading billing engine metadata..." />;
  }

  const selectedClient = metaData?.clients.find((c) => c.id === selectedClientId);

  // Initialize draft items if empty
  if (draftItems.length === 0 && metaData?.products && metaData.products.length > 0) {
    const p = metaData.products[0];
    setDraftItems([
      {
        product_id: p.id,
        quantity: 1,
        rate: Number(p.base_price),
        gst_rate: taxMode === 'non_taxable' ? 0 : Number(p.default_gst_rate),
        price_source_label: `Base price · ₹${p.base_price}`,
      },
    ]);
  }

  const handleItemChange = (index: number, field: keyof DraftLineItem, value: any) => {
    const newItems = [...draftItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    setDraftItems(newItems);
  };

  // Calculations for UI preview (Laravel server remains authoritative)
  const isInterstate = Boolean(
    selectedClient &&
      activeOrganization &&
      selectedClient.state.trim().toLowerCase() !== activeOrganization.state.trim().toLowerCase()
  );

  let subtotal = 0;
  let totalGst = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  const gstRatesSet = new Set<number>();

  draftItems.forEach((item) => {
    const effectiveGstRate = taxMode === 'non_taxable' ? 0 : item.gst_rate;
    const lineTaxable = round(item.quantity * item.rate);
    const lineGst = round(lineTaxable * (effectiveGstRate / 100));

    subtotal += lineTaxable;
    totalGst += lineGst;
    gstRatesSet.add(effectiveGstRate);

    if (taxMode !== 'non_taxable') {
      if (isInterstate) {
        igstTotal += lineGst;
      } else {
        cgstTotal += round(lineGst / 2);
        sgstTotal += round(lineGst / 2);
      }
    }
  });

  const grandTotal = round(subtotal + totalGst);
  const hasMixedGst = taxMode !== 'non_taxable' && gstRatesSet.size > 1;

  function round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  const handleFinalize = async () => {
    let idToFinalize = createdInvoiceId;

    setErrorMsg(null);
    setSuccessMessage(null);

    try {
      if (!idToFinalize) {
        if (!selectedClientId) {
          setErrorMsg('Please select a customer.');
          return;
        }
        const draft = await createInvoiceMutation.mutateAsync({
          client_id: selectedClientId,
          document_type: selectedDocumentType,
          tax_mode: taxMode,
          template_key: resolvedTemplateKey,
          date: date,
          items: draftItems,
        });
        idToFinalize = draft.id;
      }

      const finalized = await finalizeInvoiceMutation.mutateAsync(idToFinalize);
      setCreatedInvoiceId(finalized.id);
      setSuccessMessage(
        `Invoice ${finalized.invoice_number} finalized successfully! Sequence locked in ledger.`
      );

      // Trigger Stamp Animation
      setShowStampAnimation(true);
      setTimeout(() => setShowStampAnimation(false), 2500);

      clearDraft();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to finalize invoice.');
    }
  };

  return (
    <div className="space-y-8">
      <InvoicePreviewModal
        isOpen={isPreviewOpen}
        invoiceId={createdInvoiceId}
        initialTemplateKey={resolvedTemplateKey}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Stamp Animation Overlay */}
      {showStampAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-emerald-500 font-extrabold text-7xl md:text-9xl border-8 border-emerald-500 rounded-2xl px-8 py-4 transform -rotate-12 opacity-0 animate-stamp-down drop-shadow-2xl bg-white/20 backdrop-blur-sm">
            FINALIZED
          </div>
          <style>{`
            @keyframes stampDown {
              0% { transform: scale(3) rotate(-12deg); opacity: 0; }
              20% { transform: scale(1) rotate(-12deg); opacity: 1; filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.5)); }
              80% { transform: scale(1) rotate(-12deg); opacity: 1; filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.2)); }
              100% { transform: scale(0.9) rotate(-12deg); opacity: 0; }
            }
            .animate-stamp-down {
              animation: stampDown 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
          `}</style>
        </div>
      )}

      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              DOCUMENT STUDIO
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500 font-mono">
              {activeOrganization?.name} ({activeOrganization?.state})
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Billing & Document Workspace
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Compose tax invoices, commercial bills, proformas, and delivery challans with real-time price intelligence and GST calculations.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {createdInvoiceId && (
            <Button
              variant="secondary"
              onClick={() => setIsPreviewOpen(true)}
              icon={<Eye className="w-4 h-4 text-[#D4F442]" />}
            >
              Preview Document
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => setWhatsAppDrawerOpen(true)}
            icon={<MessageSquare className="w-4 h-4 text-stone-700" />}
          >
            <span>WhatsApp Parser</span>
            <ShortcutHint type="parser" className="ml-1" />
          </Button>
        </div>
      </div>

      {errorMsg && <ErrorAlert title="Billing Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {/* Non-blocking Mixed GST Rate Warning */}
      {hasMixedGst && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-950 text-xs font-semibold flex items-center space-x-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Mixed GST Rates Detected:</strong> This bill contains line items with different GST rates ({Array.from(gstRatesSet).map((r) => `${r}%`).join(', ')}). The backend tax calculator will calculate per-item GST breakdown cleanly upon finalization.
          </span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-950 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          {createdInvoiceId && (
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-3 py-1 bg-stone-900 text-[#D4F442] rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview / Print</span>
            </button>
          )}
        </div>
      )}

      {/* Main Document Composer Container */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-stone-900/[0.06] shadow-xs overflow-hidden space-y-6">
        {/* Document Header Controls Bar */}
        <div className="p-6 lg:p-8 bg-stone-50/60 border-b border-stone-900/[0.05] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormSelect
            label="Document Type"
            value={selectedDocumentType}
            onChange={(e) => setSelectedDocumentType(e.target.value as any)}
          >
            <option value="quote">Quote / Commercial Estimate</option>
            <option value="proforma">Proforma Invoice</option>
            <option value="challan">Delivery Challan</option>
            <option value="invoice">Official Tax Invoice / Bill</option>
          </FormSelect>

          <FormSelect
            label="Taxation Mode"
            value={taxMode}
            onChange={(e) => setTaxMode(e.target.value as 'taxable' | 'non_taxable')}
          >
            <option value="taxable">Taxable (GST Applies)</option>
            <option value="non_taxable">Non-Taxable (No GST / Exempt)</option>
          </FormSelect>

          <div className="space-y-1.5">
            <FormSelect
              label="Customer / Client"
              value={selectedClientId || ''}
              onChange={(e) => handleClientChange(Number(e.target.value) || null)}
            >
              <option value="">-- Select Customer --</option>
              {metaData?.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_name || c.state})
                </option>
              ))}
            </FormSelect>
            {selectedClient && (
              <div className="text-[10px] text-stone-500 font-mono pt-0.5">
                GSTIN: <span className="font-bold text-stone-800">{selectedClient.gst_number || 'URP'}</span> • {selectedClient.state}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <FormInput
              label="Document Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="text-[10px] text-stone-500 font-bold flex items-center space-x-1 pt-0.5">
              <Layout className="w-3 h-3 text-stone-400 shrink-0" />
              <span>{resolvedTemplateKey} • {templateSourceLabel}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table Area */}
        <div className="p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-stone-900 text-sm tracking-tight">
                Document Line Items ({draftItems.length})
              </h3>
              {taxMode === 'non_taxable' && (
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-900 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase">
                  Non-Taxable Mode
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (metaData?.products && metaData.products.length > 0) {
                  const p = metaData.products[0];
                  addDraftItem({
                    product_id: p.id,
                    quantity: 1,
                    rate: Number(p.base_price),
                    gst_rate: taxMode === 'non_taxable' ? 0 : Number(p.default_gst_rate),
                    price_source_label: `Base price · ₹${p.base_price}`,
                  });
                }
              }}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              <span>Add Line Item</span>
              <ShortcutHint type="addLineItem" className="ml-1" />
            </Button>
          </div>

          <div className="overflow-x-auto border border-stone-900/[0.06] rounded-2xl bg-white">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50/80 text-stone-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-900/[0.05]">
                <tr>
                  <th className="p-3.5 w-5/12">Product Description</th>
                  <th className="p-3.5 w-2/12 text-center">Quantity</th>
                  <th className="p-3.5 w-2/12 text-right">Rate (₹)</th>
                  <th className="p-3.5 w-1/12 text-center">GST %</th>
                  <th className="p-3.5 w-2/12 text-right">Line Total (₹)</th>
                  <th className="p-3.5 w-1/12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {draftItems.map((item, idx) => {
                  const effectiveGstRate = taxMode === 'non_taxable' ? 0 : item.gst_rate;
                  const lineTaxable = round(item.quantity * item.rate);
                  const lineGst = round(lineTaxable * (effectiveGstRate / 100));
                  const lineTotal = round(lineTaxable + lineGst);

                  return (
                    <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-3">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                          className="w-full text-xs font-semibold p-2 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                        >
                          {metaData?.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (HSN: {p.hsn_code || 'NA'})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full text-xs font-extrabold text-center p-2 border border-stone-200 rounded-xl bg-white text-stone-900"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                          className="w-full text-xs font-extrabold text-right p-2 border border-stone-200 rounded-xl bg-white text-stone-900"
                        />
                        {item.price_source_label && (
                          <div
                            className="text-[9px] text-stone-500 font-mono text-right pt-1 truncate"
                            title={item.price_source_label}
                          >
                            {item.price_source_label}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={taxMode === 'non_taxable'}
                          value={effectiveGstRate}
                          onChange={(e) => handleItemChange(idx, 'gst_rate', Number(e.target.value))}
                          className="w-full text-xs font-bold text-center p-2 border border-stone-200 rounded-xl bg-white text-stone-900 disabled:bg-stone-100 disabled:text-stone-400"
                        />
                      </td>
                      <td className="p-3 text-right font-extrabold text-stone-900 text-sm">
                        ₹{lineTotal.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        {draftItems.length > 1 && (
                          <button
                            onClick={() => removeDraftItem(idx)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary Panel & Accordion */}
          <div className="pt-4 border-t border-stone-900/[0.05] flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                className="text-xs text-stone-700 font-bold hover:text-stone-950 flex items-center space-x-1.5 cursor-pointer bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200 transition-colors"
              >
                <span>{showTaxBreakdown ? 'Hide GST Breakdown' : 'View Detailed GST Breakdown'}</span>
                {showTaxBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500" />}
              </button>

              {showTaxBreakdown && (
                <div className="p-4 bg-stone-50/90 border border-stone-900/[0.06] rounded-2xl text-xs space-y-1.5 text-stone-700 min-w-[280px] animate-fade-in">
                  <div className="flex justify-between">
                    <span>Taxable Subtotal:</span>
                    <span className="font-extrabold text-stone-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {taxMode === 'non_taxable' ? (
                    <div className="flex justify-between text-amber-900 font-semibold">
                      <span>GST (Non-Taxable Order):</span>
                      <span>₹0.00 (Exempt)</span>
                    </div>
                  ) : isInterstate ? (
                    <div className="flex justify-between text-stone-900">
                      <span>IGST (Interstate):</span>
                      <span className="font-bold">₹{igstTotal.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>CGST (Intrastate):</span>
                        <span className="font-bold">₹{cgstTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (Intrastate):</span>
                        <span className="font-bold">₹{sgstTotal.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between border-t border-stone-200 pt-1.5 font-bold text-stone-900">
                    <span>Total GST Amount:</span>
                    <span>₹{totalGst.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Dominant Total Floating Card */}
            <div className="bg-[#121316] text-white p-6 rounded-3xl shadow-lg border border-stone-800 space-y-2 text-right min-w-[280px]">
              <div className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">
                Subtotal ₹{subtotal.toFixed(2)} + GST ₹{totalGst.toFixed(2)}
              </div>
              <div className="text-4xl font-extrabold text-[#D4F442] tracking-tight">
                ₹{grandTotal.toFixed(2)}
              </div>
              <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                {taxMode === 'non_taxable'
                  ? 'Non-Taxable Order Grand Total'
                  : selectedDocumentType === 'invoice'
                  ? 'Official Tax Invoice Grand Total'
                  : `${selectedDocumentType.toUpperCase()} Total`}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-6 bg-stone-50/80 border-t border-stone-900/[0.05] flex items-center justify-between">
          <Button variant="ghost" onClick={clearDraft}>
            Clear Form
          </Button>

          <div className="flex items-center space-x-3">
            {activeRole !== 'auditor' && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  isLoading={createInvoiceMutation.isPending}
                  disabled={createInvoiceMutation.isPending || finalizeInvoiceMutation.isPending}
                  icon={<FileCheck className="w-4 h-4 text-stone-300" />}
                >
                  <span>Save Draft</span>
                  <ShortcutHint type="saveDraft" className="ml-1" />
                </Button>

                <Button
                  variant="primary"
                  onClick={handleFinalize}
                  isLoading={finalizeInvoiceMutation.isPending}
                  disabled={createInvoiceMutation.isPending || finalizeInvoiceMutation.isPending}
                  icon={<Lock className="w-4 h-4 text-stone-950" />}
                >
                  <span>Finalize & Lock Invoice</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
