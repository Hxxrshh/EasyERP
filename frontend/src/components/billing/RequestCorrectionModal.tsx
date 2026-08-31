import React, { useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import { useMetaQuery } from '../../hooks/useApiQueries';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { FileEdit, X, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface RequestCorrectionModalProps {
  isOpen: boolean;
  invoice: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestCorrectionModal: React.FC<RequestCorrectionModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const { data: metaData } = useMetaQuery();

  const [reason, setReason] = useState('');
  const [proposedItems, setProposedItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (invoice?.items) {
      setProposedItems(
        invoice.items.map((i: any) => ({
          product_id: i.product_id,
          name: i.product?.name || 'Product',
          quantity: i.quantity,
          rate: i.rate,
          gst_rate: i.gst_rate,
        }))
      );
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleUpdateItem = (idx: number, field: string, val: number) => {
    const updated = [...proposedItems];
    updated[idx][field] = val;
    setProposedItems(updated);
  };

  const handleAddItem = () => {
    const firstProd = metaData?.products[0];
    if (!firstProd) return;
    setProposedItems([
      ...proposedItems,
      {
        product_id: firstProd.id,
        name: firstProd.name,
        quantity: 1,
        rate: firstProd.base_price || 100,
        gst_rate: firstProd.default_gst_rate || 18,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (proposedItems.length <= 1) {
      toast.error('Correction must contain at least 1 line item.');
      return;
    }
    setProposedItems(proposedItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please enter a clear business reason for requesting this correction.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiClient.post(`/invoices/${invoice.id}/request-correction`, {
        reason,
        items: proposedItems.map((pi) => ({
          product_id: pi.product_id,
          quantity: Number(pi.quantity),
          rate: Number(pi.rate),
          gst_rate: Number(pi.gst_rate),
        })),
      });

      toast.success('Historical correction request submitted for Administrator approval.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit correction request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-3xl w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col max-h-[90vh] animate-pop-in">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileEdit className="w-5 h-5 text-[#D4F442]" />
            <h3 className="font-extrabold text-sm tracking-tight">
              Request Formal Invoice Correction ({invoice.invoice_number})
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && <ErrorAlert title="Correction Request Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

          {/* Warning Banner */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-950 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Strict Accounting Control Notice:</strong> Finalized invoices are immutable legal documents. Requesting a correction creates an official audit trail entry. Upon Administrator approval, differential inventory adjustments and ledger balance recalculations will be performed.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">Reason for Correction Request *</label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Incorrect quantity entered during initial dispatch order entry."
                className="w-full text-xs font-medium p-3 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            {/* Line Item Modification Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-stone-800 text-xs uppercase tracking-wider">
                  Proposed Item Adjustments
                </h4>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-bold text-stone-700 hover:text-stone-950 flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] border-b border-stone-200">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 w-28">Proposed Qty</th>
                      <th className="p-2.5 w-28 text-right">Proposed Rate (₹)</th>
                      <th className="p-2.5 w-20 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {proposedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5">
                          <select
                            value={item.product_id}
                            onChange={(e) => {
                              const pId = Number(e.target.value);
                              const prod = metaData?.products.find((p) => p.id === pId);
                              handleUpdateItem(idx, 'product_id', pId);
                              if (prod) {
                                const updated = [...proposedItems];
                                updated[idx].name = prod.name;
                                updated[idx].rate = prod.base_price;
                                updated[idx].gst_rate = prod.default_gst_rate;
                                setProposedItems(updated);
                              }
                            }}
                            className="w-full text-xs p-1.5 border border-stone-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-1 focus:ring-stone-900"
                          >
                            {metaData?.products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                            className="w-full text-xs p-1.5 border border-stone-200 rounded-xl font-bold"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.rate}
                            onChange={(e) => handleUpdateItem(idx, 'rate', Number(e.target.value))}
                            className="w-full text-xs p-1.5 border border-stone-200 rounded-xl text-right font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-200">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Submit Correction Request
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
