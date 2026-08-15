import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBillingStore, type DraftLineItem } from '../../store/useBillingStore';
import {
  useMetaQuery,
  useCreateInvoiceMutation,
  useFinalizeInvoiceMutation,
} from '../../hooks/useApiQueries';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
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
} from 'lucide-react';

export const BillingWorkspace: React.FC = () => {
  const { activeOrganization, activeRole } = useAuth();
  const {
    selectedClientId,
    setSelectedClientId,
    selectedDocumentType,
    setSelectedDocumentType,
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
        date: date,
        items: draftItems,
      });

      setCreatedInvoiceId(invoice.id);
      setSuccessMessage(`Draft ${selectedDocumentType.toUpperCase()} created successfully!`);
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
          gst_rate: Number(firstProd.default_gst_rate),
        });
      }
    },
  });

  if (isMetaLoading) {
    return <LoadingSpinner label="Loading billing master metadata..." />;
  }

  const selectedClient = metaData?.clients.find((c) => c.id === selectedClientId);

  // Initialize draft items if empty
  if (draftItems.length === 0 && metaData?.products && metaData.products.length > 0) {
    const p = metaData.products[0];
    setDraftItems([{ product_id: p.id, quantity: 1, rate: Number(p.base_price), gst_rate: Number(p.default_gst_rate) }]);
  }

  const handleProductChange = (index: number, productId: number) => {
    const prod = metaData?.products.find((p) => p.id === productId);
    if (!prod) return;

    const newItems = [...draftItems];
    newItems[index] = {
      ...newItems[index],
      product_id: prod.id,
      rate: Number(prod.base_price),
      gst_rate: Number(prod.default_gst_rate),
    };
    setDraftItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof DraftLineItem, value: number) => {
    const newItems = [...draftItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    setDraftItems(newItems);
  };

  // Frontend calculation for UI preview (Laravel server remains authoritative)
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
    const lineTaxable = round(item.quantity * item.rate);
    const lineGst = round(lineTaxable * (item.gst_rate / 100));

    subtotal += lineTaxable;
    totalGst += lineGst;
    gstRatesSet.add(item.gst_rate);

    if (isInterstate) {
      igstTotal += lineGst;
    } else {
      cgstTotal += round(lineGst / 2);
      sgstTotal += round(lineGst / 2);
    }
  });

  const grandTotal = round(subtotal + totalGst);
  const hasMixedGst = gstRatesSet.size > 1;

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
          date: date,
          items: draftItems,
        });
        idToFinalize = draft.id;
      }

      const finalized = await finalizeInvoiceMutation.mutateAsync(idToFinalize);
      setCreatedInvoiceId(finalized.id);
      setSuccessMessage(`Invoice ${finalized.invoice_number} finalized successfully! Assigned FY sequence number.`);
      clearDraft();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to finalize invoice.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Billing & Document Workspace</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Seller: <strong className="text-slate-800">{activeOrganization?.name}</strong> ({activeOrganization?.state}) | GSTIN: {activeOrganization?.gst_number || 'Non-GST'}
          </p>
        </div>

        <Button variant="ghost" onClick={() => setWhatsAppDrawerOpen(true)} icon={<MessageSquare className="w-4 h-4 text-emerald-600" />}>
          <span>WhatsApp Parser</span>
          <ShortcutHint type="parser" className="ml-1" />
        </Button>
      </div>

      {errorMsg && <ErrorAlert title="Billing Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Editor Main Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Document Header Controls */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormSelect
            label="Document Type"
            value={selectedDocumentType}
            onChange={(e) => setSelectedDocumentType(e.target.value as any)}
          >
            <option value="quote">Quote / Estimate</option>
            <option value="proforma">Proforma Invoice</option>
            <option value="challan">Delivery Challan</option>
            <option value="invoice">Official Tax Invoice</option>
          </FormSelect>

          <div className="space-y-1">
            <FormSelect
              label="Customer / Client"
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(Number(e.target.value) || null)}
            >
              <option value="">-- Select Customer --</option>
              {metaData?.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_name || c.state})
                </option>
              ))}
            </FormSelect>
            {selectedClient && (
              <div className="text-[11px] text-slate-500 font-medium pt-0.5">
                GSTIN: <span className="font-bold text-slate-700">{selectedClient.gst_number || 'URP (Unregistered)'}</span> | State: <span className="font-bold text-slate-700">{selectedClient.state}</span>
              </div>
            )}
          </div>

          <FormInput
            label="Document Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Line Items Grid Table */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Invoice Line Items</h3>
            <Button
              variant="ghost"
              onClick={() => {
                if (metaData?.products && metaData.products.length > 0) {
                  const p = metaData.products[0];
                  addDraftItem({ product_id: p.id, quantity: 1, rate: Number(p.base_price), gst_rate: Number(p.default_gst_rate) });
                }
              }}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              <span>Add Line Item</span>
              <ShortcutHint type="addLineItem" className="ml-1" />
            </Button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3 w-5/12">Product Description</th>
                  <th className="p-3 w-2/12 text-center">Quantity</th>
                  <th className="p-3 w-2/12 text-right">Rate (₹)</th>
                  <th className="p-3 w-1/12 text-center">GST %</th>
                  <th className="p-3 w-2/12 text-right">Line Total (₹)</th>
                  <th className="p-3 w-1/12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {draftItems.map((item, idx) => {
                  const lineTaxable = round(item.quantity * item.rate);
                  const lineGst = round(lineTaxable * (item.gst_rate / 100));
                  const lineTotal = round(lineTaxable + lineGst);

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                          className="w-full text-xs font-medium p-2 border border-slate-300 rounded bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                        >
                          {metaData?.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (HSN: {p.hsn_code || 'NA'})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full text-xs font-bold text-center p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                          className="w-full text-xs font-bold text-right p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.gst_rate}
                          onChange={(e) => handleItemChange(idx, 'gst_rate', Number(e.target.value))}
                          className="w-full text-xs font-bold text-center p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-slate-900">
                        ₹{lineTotal.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-center">
                        {draftItems.length > 1 && (
                          <button
                            onClick={() => removeDraftItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
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

          {/* Mixed GST Warning Banner */}
          {hasMixedGst && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Line items contain mixed GST rates ({Array.from(gstRatesSet).join('%, ')}%). Review tax breakdown before finalization.</span>
            </div>
          )}

          {/* Totals Summary Panel */}
          <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>{showTaxBreakdown ? 'Hide Detailed Tax Breakdown' : 'View Detailed Tax Breakdown'}</span>
                {showTaxBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTaxBreakdown && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700 min-w-[280px]">
                  <div className="flex justify-between">
                    <span>Taxable Subtotal:</span>
                    <span className="font-bold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {isInterstate ? (
                    <div className="flex justify-between text-blue-700">
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
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                    <span>Total GST Amount:</span>
                    <span>₹{totalGst.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Dominant Total Box */}
            <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 space-y-2 text-right min-w-[300px]">
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Subtotal: ₹{subtotal.toFixed(2)} + GST: ₹{totalGst.toFixed(2)}</div>
              <div className="text-3xl font-extrabold text-emerald-400">₹{grandTotal.toFixed(2)}</div>
              <div className="text-[11px] text-slate-400">
                {selectedDocumentType === 'invoice' ? 'Official Tax Invoice Grand Total' : `${selectedDocumentType.toUpperCase()} Total`}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
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
                  icon={<FileCheck className="w-4 h-4" />}
                >
                  <span>Save Draft</span>
                  <ShortcutHint type="saveDraft" className="ml-1" />
                </Button>

                <Button
                  variant="primary"
                  onClick={handleFinalize}
                  isLoading={finalizeInvoiceMutation.isPending}
                  disabled={createInvoiceMutation.isPending || finalizeInvoiceMutation.isPending}
                  icon={<Lock className="w-4 h-4" />}
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
