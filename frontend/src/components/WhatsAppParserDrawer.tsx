import React, { useState } from 'react';
import { useBillingStore } from '../store/useBillingStore';
import { useMetaQuery } from '../hooks/useApiQueries';
import { apiClient } from '../services/apiClient';
import { uiEventBus } from '../services/uiEventBus';
import { Button } from './ui/Button';
import { X, MessageSquare, ArrowRight, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export const WhatsAppParserDrawer: React.FC = () => {
  const { isWhatsAppDrawerOpen, setWhatsAppDrawerOpen, selectedClientId, setSelectedClientId, addDraftItem } = useBillingStore();
  const { data: metaData } = useMetaQuery();

  const [rawText, setRawText] = useState('rr\nhdpe 50\npp_bags 100');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isWhatsAppDrawerOpen) return null;

  const handleParse = async () => {
    setIsParsing(true);
    setParseError(null);
    setParsedResult(null);
    uiEventBus.emit({ type: 'PARSER_STARTED' });

    try {
      const response = await apiClient.post<any>('/parser/whatsapp', {
        raw_text: rawText,
      });

      setParsedResult(response);
      if (response.client) {
        setSelectedClientId(response.client.id);
      }
      uiEventBus.emit({ type: 'PARSER_COMPLETED' });
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
          rate: item.rate || 0,
          gst_rate: item.gst_rate || 18,
          price_source_label: `WhatsApp Parsed Rate · ₹${item.rate}`,
        });
      }
    });

    setWhatsAppDrawerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-[#FAF9F5] h-full shadow-2xl flex flex-col justify-between border-l border-stone-900/[0.08] animate-slide-in-right">
        {/* Drawer Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <MessageSquare className="w-5 h-5 text-[#D4F442]" />
            <h2 className="font-extrabold text-sm tracking-tight text-white">WhatsApp Order Text Parser</h2>
          </div>
          <button
            onClick={() => setWhatsAppDrawerOpen(false)}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
          <div className="text-xs text-stone-600 bg-stone-50 p-4 rounded-2xl border border-stone-100 leading-relaxed">
            Paste raw text orders directly from WhatsApp (e.g. <code>rr \n hdpe 50 \n pp_bags 100</code>). Line 1 matches Customer short code; remaining lines match product items and quantities.
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">Selected Customer Context</label>
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(Number(e.target.value) || null)}
              className="w-full text-xs font-bold p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            >
              <option value="">-- Select Customer --</option>
              {metaData?.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_name || 'Individual'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">Raw WhatsApp Order Text</label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. rr&#10;hdpe 50&#10;pp_bags 100"
              className="w-full text-xs font-mono p-3 border border-stone-200 rounded-2xl bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          <Button
            onClick={handleParse}
            disabled={isParsing || !rawText.trim()}
            variant="primary"
            className="w-full"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            <span>{isParsing ? 'Parsing...' : 'Parse WhatsApp Order'}</span>
          </Button>

          {parseError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-950 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedResult && (
            <div className="space-y-4 pt-2">
              {parsedResult.client_error && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-950 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{parsedResult.client_error}</span>
                </div>
              )}

              {parsedResult.client && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-950 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Matched Customer: <strong>{parsedResult.client.name}</strong></span>
                </div>
              )}

              <div className="text-xs font-extrabold text-stone-900 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Parsed Items ({parsedResult.items?.length || 0})</span>
              </div>

              <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs bg-white">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 text-stone-500 text-[10px] font-extrabold uppercase border-b border-stone-100">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Resolved Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {parsedResult.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-semibold text-stone-900">{item.name} ({item.unit})</td>
                        <td className="p-2.5 text-center font-extrabold text-stone-900">{item.quantity}</td>
                        <td className="p-2.5 text-right font-bold text-stone-900">₹{item.rate}</td>
                      </tr>
                    ))}
                    {parsedResult.items?.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-stone-400 italic">
                          No valid product lines matched.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {parsedResult.unmatched?.length > 0 && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-700 space-y-1">
                  <div className="font-bold text-amber-800">Unmatched Lines ({parsedResult.unmatched.length})</div>
                  <ul className="list-disc list-inside text-[11px] text-stone-600">
                    {parsedResult.unmatched.map((u: any, i: number) => (
                      <li key={i}>
                        <code>{typeof u === 'string' ? u : u.line}</code> — {u.reason || 'Invalid syntax'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedResult.items?.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={handleApplyParsedItems}
                  className="w-full"
                >
                  Insert Parsed Items into Draft Bill
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 text-center text-xs text-stone-400 font-bold">
          Press <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 text-stone-700 rounded-md font-mono text-[10px]">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
};
