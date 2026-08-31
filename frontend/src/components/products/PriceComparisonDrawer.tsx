import React, { useState } from 'react';
import { useMetaQuery, usePriceComparisonQuery } from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { InvoicePreviewModal } from '../common/InvoicePreviewModal';
import {
  X,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Search,
  CheckSquare,
  Square,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';

interface PriceComparisonDrawerProps {
  isOpen: boolean;
  initialProductId?: number | null;
  onClose: () => void;
}

export const PriceComparisonDrawer: React.FC<PriceComparisonDrawerProps> = ({
  isOpen,
  initialProductId,
  onClose,
}) => {
  const { data: metaData, isLoading: isMetaLoading } = useMetaQuery(true);
  const products = metaData?.products || [];
  const clients = metaData?.clients || [];

  const [selectedProductId, setSelectedProductId] = useState<number | null>(initialProductId || null);
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState<'30d' | '90d' | 'this_fy' | 'last_fy' | 'custom' | 'all'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [expandedClientHistory, setExpandedClientHistory] = useState<Record<number, boolean>>({});
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);

  // Sync initial product ID when opened
  React.useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else if (metaData?.products && metaData.products.length > 0) {
      setSelectedProductId((prev) => prev || metaData.products[0].id);
    }
  }, [initialProductId, metaData]);

  // Compute start / end dates based on filter mode
  const getFilterParams = () => {
    if (dateFilterMode === '30d') {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString().split('T')[0] };
    }
    if (dateFilterMode === '90d') {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return { startDate: start.toISOString().split('T')[0] };
    }
    if (dateFilterMode === 'this_fy') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
      return { startDate: `${startYear}-04-01`, endDate: `${startYear + 1}-03-31` };
    }
    if (dateFilterMode === 'last_fy') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const startYear = (now.getMonth() >= 3 ? currentYear : currentYear - 1) - 1;
      return { startDate: `${startYear}-04-01`, endDate: `${startYear + 1}-03-31` };
    }
    if (dateFilterMode === 'custom') {
      return { startDate: customStartDate || undefined, endDate: customEndDate || undefined };
    }
    return {};
  };

  const filterParams = getFilterParams();

  const {
    data: comparisonData,
    isLoading: isComparisonLoading,
    error: comparisonError,
  } = usePriceComparisonQuery(selectedProductId || undefined, {
    clientIds: selectedClientIds.length > 0 ? selectedClientIds : undefined,
    ...filterParams,
  });

  if (!isOpen) return null;

  const filteredClientsForPicker = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
      (c.gst_number && c.gst_number.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  );

  const handleToggleClient = (id: number) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisibleClients = () => {
    const visibleIds = filteredClientsForPicker.map((c) => c.id);
    setSelectedClientIds(Array.from(new Set([...selectedClientIds, ...visibleIds])));
  };

  const handleClearClientSelection = () => {
    setSelectedClientIds([]);
  };

  const toggleClientHistory = (clientId: number) => {
    setExpandedClientHistory((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const metrics = comparisonData?.metrics;
  const comparisons = comparisonData?.comparisons || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-xs flex justify-end">
      <InvoicePreviewModal
        isOpen={Boolean(previewInvoiceId)}
        invoiceId={previewInvoiceId}
        isFinalized={true}
        onClose={() => setPreviewInvoiceId(null)}
      />

      <div className="bg-stone-50 border-l border-stone-900/[0.08] w-full max-w-5xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="bg-white border-b border-stone-200 p-6 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
                PRICE INTELLIGENCE ENGINE
              </span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
              Cross-Client Product Price Comparison
            </h1>
            <p className="text-xs text-stone-500 max-w-xl">
              Compare actual historical selling rates from finalized tax invoices across different clients.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Control Panel: Product & Client Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
            {/* Product Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-600">
                1. Select Product
              </label>
              {isMetaLoading ? (
                <LoadingSpinner label="Loading products..." />
              ) : (
                <select
                  value={selectedProductId || ''}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  className="w-full text-xs font-semibold p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-stone-900 focus:outline-none text-stone-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.short_name ? `(${p.short_name})` : ''} — Base: ₹{p.base_price} {p.is_archived ? '[ARCHIVED]' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date Range Selector */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-600">
                2. Filter Date Range
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'all', label: 'All Time' },
                  { key: '30d', label: 'Last 30 Days' },
                  { key: '90d', label: 'Last 90 Days' },
                  { key: 'this_fy', label: 'This Financial Year' },
                  { key: 'last_fy', label: 'Last FY' },
                  { key: 'custom', label: 'Custom Range' },
                ].map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => setDateFilterMode(btn.key as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      dateFilterMode === btn.key
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {dateFilterMode === 'custom' && (
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="text-xs p-1.5 border border-stone-200 rounded-lg bg-stone-50 text-stone-900 font-semibold"
                  />
                  <span className="text-xs text-stone-400">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="text-xs p-1.5 border border-stone-200 rounded-lg bg-stone-50 text-stone-900 font-semibold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Client Multi-Select Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
                3. Filter Clients ({selectedClientIds.length === 0 ? 'All Clients' : `${selectedClientIds.length} Selected`})
              </label>
              <div className="flex items-center space-x-3 text-xs">
                <button
                  onClick={handleSelectAllVisibleClients}
                  className="text-stone-600 hover:text-stone-900 font-semibold flex items-center space-x-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select Visible</span>
                </button>
                {selectedClientIds.length > 0 && (
                  <button
                    onClick={handleClearClientSelection}
                    className="text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Filter</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                placeholder="Search clients by name, GSTIN..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold border border-stone-200 rounded-xl bg-stone-50 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            {/* Client selection chips */}
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pt-1">
              {filteredClientsForPicker.map((client) => {
                const isSelected = selectedClientIds.includes(client.id);
                return (
                  <button
                    key={client.id}
                    onClick={() => handleToggleClient(client.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="w-3 h-3 text-emerald-400" /> : <Square className="w-3 h-3 text-stone-400" />}
                    <span>{client.name}</span>
                    {client.is_archived && <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded">ARCHIVED</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {comparisonError && (
            <ErrorAlert title="Price Comparison Error" message={(comparisonError as Error).message} />
          )}

          {isComparisonLoading ? (
            <LoadingSpinner label="Analyzing finalized invoice rates across clients..." />
          ) : (
            metrics && (
              <div className="space-y-6">
                {/* Visual Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Lowest Price Card */}
                  <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                      <span>Lowest Selling Rate</span>
                      <TrendingDown className="w-4 h-4 text-emerald-600" />
                    </div>
                    {metrics.lowest ? (
                      <div>
                        <div className="text-2xl font-black text-emerald-950 font-mono">
                          ₹{metrics.lowest.rate.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-800 truncate mt-1">
                          {metrics.lowest.client_name}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-mono">
                          Inv #{metrics.lowest.invoice_number} · {dateFmt(metrics.lowest.date)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-700 italic pt-2">No historical sales</div>
                    )}
                  </div>

                  {/* Average Price Card */}
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold uppercase tracking-wider">
                      <span>Average Rate</span>
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-blue-950 font-mono">
                        ₹{metrics.average.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] font-semibold text-blue-800 mt-1">
                        Across {metrics.clients_with_sales} client(s)
                      </div>
                      <div className="text-[10px] text-blue-600 font-mono">
                        Catalog Base: ₹{metrics.base_price}
                      </div>
                    </div>
                  </div>

                  {/* Highest Price Card */}
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold uppercase tracking-wider">
                      <span>Highest Selling Rate</span>
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                    </div>
                    {metrics.highest ? (
                      <div>
                        <div className="text-2xl font-black text-amber-950 font-mono">
                          ₹{metrics.highest.rate.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] font-semibold text-amber-800 truncate mt-1">
                          {metrics.highest.client_name}
                        </div>
                        <div className="text-[10px] text-amber-600 font-mono">
                          Inv #{metrics.highest.invoice_number} · {dateFmt(metrics.highest.date)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-700 italic pt-2">No historical sales</div>
                    )}
                  </div>

                  {/* Price Spread Card */}
                  <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center justify-between text-purple-800 text-[11px] font-bold uppercase tracking-wider">
                      <span>Price Spread</span>
                      <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-purple-950 font-mono">
                        ₹{metrics.spread.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] font-semibold text-purple-800 mt-1">
                        Difference (High - Low)
                      </div>
                      <div className="text-[10px] text-purple-600 font-mono">
                        Spread Delta
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Price Comparison Table */}
                <div className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-700">
                      Client-by-Client Selling Price Matrix — {selectedProduct?.name}
                    </h3>
                    <span className="text-[11px] font-mono font-bold text-stone-500">
                      {comparisons.length} Clients Loaded
                    </span>
                  </div>

                  {comparisons.length === 0 ? (
                    <div className="p-12 text-center text-xs text-stone-400">
                      No client sales found matching the active filters.
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {comparisons.map(({ client, latest_sale, history }) => {
                        const isExpanded = expandedClientHistory[client.id];
                        const isLowest = metrics.lowest?.client_id === client.id;
                        const isHighest = metrics.highest?.client_id === client.id;

                        return (
                          <div key={client.id} className="transition-colors hover:bg-stone-50/80">
                            {/* Primary Row */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1 min-w-[200px]">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-sm text-stone-900">{client.name}</span>
                                  {client.is_archived && (
                                    <span className="text-[9px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                                      ARCHIVED
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-stone-400 font-mono">
                                  {client.company_name || client.gst_number || 'No GSTIN'}
                                </div>
                              </div>

                              {/* Price & Sale Stats */}
                              <div className="flex items-center space-x-6">
                                {latest_sale ? (
                                  <div className="text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                      <span className="text-base font-black font-mono text-stone-950">
                                        ₹{latest_sale.rate.toLocaleString('en-IN')}
                                      </span>
                                      {isLowest && (
                                        <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                                          LOWEST
                                        </span>
                                      )}
                                      {isHighest && (
                                        <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                                          HIGHEST
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                                      {latest_sale.quantity} {latest_sale.unit} · {latest_sale.formatted_date}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-right text-xs text-stone-400 italic">
                                    No sales recorded
                                  </div>
                                )}

                                {latest_sale && (
                                  <button
                                    onClick={() => setPreviewInvoiceId(latest_sale.invoice_id)}
                                    className="px-2.5 py-1 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors flex items-center space-x-1"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-stone-500" />
                                    <span>#{latest_sale.invoice_number}</span>
                                  </button>
                                )}

                                {history.length > 1 && (
                                  <button
                                    onClick={() => toggleClientHistory(client.id)}
                                    className="p-1 text-stone-400 hover:text-stone-800 transition-colors"
                                    title="Toggle price history"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Expandable History Timeline */}
                            {isExpanded && history.length > 0 && (
                              <div className="bg-stone-100/60 p-4 border-t border-stone-100 space-y-2">
                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-mono">
                                  Historical Sales Timeline — {client.name}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {history.map((h, idx) => (
                                    <div
                                      key={h.item_id || idx}
                                      className="bg-white p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <div className="font-bold text-stone-900 font-mono">₹{h.rate}</div>
                                        <div className="text-[10px] text-stone-500 font-mono">{h.formatted_date} · {h.quantity} {h.unit}</div>
                                      </div>
                                      <button
                                        onClick={() => setPreviewInvoiceId(h.invoice_id)}
                                        className="text-[10px] font-bold text-blue-600 hover:underline font-mono"
                                      >
                                        #{h.invoice_number}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

function dateFmt(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
