import React, { useState } from 'react';
import { useBillingStore } from '../store/useBillingStore';
import { useMetaQuery } from '../hooks/useApiQueries';
import { apiClient } from '../services/apiClient';
import { X, MessageSquare, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

export const WhatsAppParserDrawer: React.FC = () => {
  const { isWhatsAppDrawerOpen, setWhatsAppDrawerOpen, selectedClientId, setSelectedClientId, addDraftItem } = useBillingStore();
  const { data: metaData } = useMetaQuery();

  const [rawText, setRawText] = useState('hdpe 50\npp 100');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isWhatsAppDrawerOpen) return null;

  const handleParse = async () => {
    setIsParsing(true);
    setParseError(null);
    setParsedResult(null);

    try {
      const response = await apiClient.post<any>('/parser/whatsapp', {
        text: rawText,
        client_id: selectedClientId || metaData?.clients[0]?.id || null,
      });

      setParsedResult(response);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse text via WhatsApp Smart Parser.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyParsedItems = () => {
    if (!parsedResult?.items) return;

    parsedResult.items.forEach((item: any) => {
      if (item.product_id && item.quantity > 0) {
        addDraftItem({
          product_id: item.product_id,
          quantity: item.quantity,
          rate: item.resolved_rate || 0,
          gst_rate: item.gst_rate || 18,
        });
      }
    });

    setWhatsAppDrawerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base">WhatsApp Smart Parser</h2>
          </div>
          <button
            onClick={() => setWhatsAppDrawerOpen(false)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
            Paste raw customer order text received via WhatsApp or Chat. The backend parser identifies products, quantities, and price history automatically.
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Select Customer Context</label>
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(Number(e.target.value) || null)}
              className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
            >
              <option value="">-- Select Customer --</option>
              {metaData?.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_name || 'Individual'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Raw Order Text</label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. hdpe 50 bags\npp granules 100 kg"
              className="w-full text-xs font-mono p-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
            />
          </div>

          <button
            onClick={handleParse}
            disabled={isParsing || !rawText.trim()}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded transition-colors flex items-center justify-center space-x-2"
          >
            <span>{isParsing ? 'Parsing Text...' : 'Parse WhatsApp Text'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedResult && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Parsed Line Items ({parsedResult.items?.length || 0})</span>
              </div>

              <div className="border rounded overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 border-b">
                    <tr>
                      <th className="p-2">Product</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Resolved Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedResult.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b bg-white">
                        <td className="p-2 font-medium text-slate-800">{item.product_name || item.raw_product_string}</td>
                        <td className="p-2">{item.quantity}</td>
                        <td className="p-2 font-semibold text-slate-900">₹{item.resolved_rate || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleApplyParsedItems}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded transition-colors"
              >
                Insert Parsed Items into Draft Invoice
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-slate-50 border-t text-center text-xs text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
};
