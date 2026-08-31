import React, { useState } from 'react';
import { useInventoryStockQuery, useRecordStockMovementMutation } from '../../hooks/useApiQueries';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { FormInput } from '../ui/FormInput';
import { FormSelect } from '../ui/FormSelect';
import {
  Search,
  AlertTriangle,
  Layers,
  History,
  X,
} from 'lucide-react';

export const InventoryWorkspace: React.FC = () => {
  const { activeRole } = useAuth();
  const { data: stockItems, isLoading, error } = useInventoryStockQuery();
  const movementMutation = useRecordStockMovementMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStockForMovement, setSelectedStockForMovement] = useState<any | null>(null);
  const [recentlyUpdatedProductId, setRecentlyUpdatedProductId] = useState<number | null>(null);

  // Manual Movement Form State
  const [movementType, setMovementType] = useState<'inward' | 'outward' | 'adjustment'>('inward');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingSpinner label="Loading physical stock ledger..." />;
  }

  const items = stockItems || [];
  const filteredItems = items.filter((item: any) =>
    (item.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.product?.hsn_code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnits = items.reduce((acc: number, item: any) => acc + Number(item.current_quantity || 0), 0);
  const lowStockCount = items.filter((item: any) => Number(item.current_quantity) <= Number(item.low_stock_threshold || 10)).length;

  const handleOpenMovementModal = (item: any) => {
    setSelectedStockForMovement(item);
    setUnitCost(Number(item.product?.base_price || 0));
    setQuantity(1);
    setNotes('');
    setActionError(null);
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForMovement) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      let backendType = 'adjustment';
      if (movementType === 'inward') backendType = 'stock_in';
      if (movementType === 'outward') backendType = 'stock_out';

      await movementMutation.mutateAsync({
        productId: selectedStockForMovement.product_id,
        payload: {
          type: backendType,
          quantity: Number(quantity),
          notes: notes,
        },
      });

      const pid = selectedStockForMovement.product_id;
      setSelectedStockForMovement(null);
      setRecentlyUpdatedProductId(pid);
      setTimeout(() => setRecentlyUpdatedProductId(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to record stock movement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              PHYSICAL LEDGER
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500 font-mono">
              {items.length} Stock Keeping Units
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Physical Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Real-time physical stock levels updated seamlessly across invoice deliveries, customer returns, and physical audit adjustments.
          </p>
        </div>
      </div>

      {error && <ErrorAlert title="Inventory Error" message={(error as Error).message} />}

      {/* Inventory KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121316] text-white p-6 rounded-3xl shadow-lg border border-stone-800 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4F442]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">Total Physical Units</div>
          <div className="text-3xl font-extrabold text-[#FAF9F5] tracking-tight">{totalUnits.toLocaleString()}</div>
          <p className="text-[11px] text-stone-400 font-medium">Aggregated across all registered catalog items</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-stone-900/[0.06] shadow-xs space-y-2">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500">Active SKUs</div>
          <div className="text-3xl font-extrabold text-stone-900 tracking-tight">{items.length}</div>
          <p className="text-[11px] text-stone-500">Catalog products under stock control</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-stone-900/[0.06] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500">Low Stock Warnings</span>
            {lowStockCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <div className={`text-3xl font-extrabold tracking-tight ${lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {lowStockCount}
          </div>
          <p className="text-[11px] text-stone-500">Items below minimum reorder thresholds</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/85 backdrop-blur-md p-5 rounded-3xl border border-stone-900/[0.06] shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock by SKU name or HSN..."
            className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900 placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Stock Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item: any) => {
          const qty = Number(item.current_quantity || 0);
          const threshold = Number(item.low_stock_threshold || 10);
          const isLow = qty <= threshold;
          const ratio = Math.min(100, Math.max(10, Math.round((qty / (threshold * 3)) * 100)));

          const isRecentlyUpdated = recentlyUpdatedProductId === (item.id || item.product_id);

          return (
            <div
              key={item.id || item.product_id}
              className={`bg-white/85 backdrop-blur-md border rounded-3xl p-6 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                isRecentlyUpdated 
                  ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse' 
                  : 'border-stone-900/[0.06] hover:shadow-md hover:border-stone-900/[0.12]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase font-mono text-stone-400">
                    HSN {item.product?.hsn_code || 'N/A'}
                  </span>
                  {isLow ? (
                    <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-900 border border-rose-500/20 rounded-full text-[10px] font-extrabold flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>Low Stock</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-950 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                      In Stock
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-stone-900 text-lg tracking-tight">
                    {item.product?.name}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Base Valuation: ₹{item.product?.base_price} / {item.product?.unit}
                  </p>
                </div>
              </div>

              {/* Visual Stock Level Meter */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-stone-500">Available Physical Stock</span>
                  <span className="text-stone-900 font-extrabold text-sm">{qty} {item.product?.unit}</span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-rose-500' : 'bg-stone-900'}`}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
                <div className="text-[10px] text-stone-400 text-right">
                  Reorder Threshold: {threshold} {item.product?.unit}
                </div>
              </div>

              {/* Quick Actions */}
              {activeRole !== 'auditor' && (
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenMovementModal(item)}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-stone-600" />
                    <span>Record Movement / Adjustment</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Stock Movement Modal */}
      {selectedStockForMovement && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden animate-pop-in">
            {/* Modal Header */}
            <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Layers className="w-5 h-5 text-[#D4F442]" />
                <h3 className="font-extrabold text-sm tracking-tight text-white">
                  Stock Adjustment — {selectedStockForMovement.product?.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStockForMovement(null)}
                className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRecordMovement} className="p-6 space-y-4 text-xs">
              {actionError && <ErrorAlert title="Movement Error" message={actionError} onDismiss={() => setActionError(null)} />}

              <FormSelect
                label="Movement Type"
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as any)}
              >
                <option value="inward">Inward (Purchase / Inbound Stock)</option>
                <option value="outward">Outward (Manual Issue / Scrapped)</option>
                <option value="adjustment">Physical Audit Correction (Adjustment)</option>
              </FormSelect>

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label={`Quantity (${selectedStockForMovement.product?.unit})`}
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />

                <FormInput
                  label="Unit Valuation Cost (₹)"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-stone-700">Movement Notes / Reason</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Physical inventory count discrepancy correction..."
                  className="w-full p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
                <Button variant="ghost" onClick={() => setSelectedStockForMovement(null)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting}>
                  Record Stock Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
