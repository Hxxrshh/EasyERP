import React, { useState } from 'react';
import type { Product } from '../../types';
import {
  useProductUsageQuery,
  useArchiveProductMutation,
  useRestoreProductMutation,
  useDeleteProductMutation,
} from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { FormInput } from '../ui/FormInput';
import { AlertTriangle, Archive, RotateCcw, Trash2, X, Package, Layers } from 'lucide-react';

interface ProductActionModalProps {
  isOpen: boolean;
  product: Product | null;
  mode: 'archive' | 'delete' | 'restore';
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProductActionModal: React.FC<ProductActionModalProps> = ({
  isOpen,
  product,
  mode: initialMode,
  onClose,
  onSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<'archive' | 'delete' | 'restore'>(initialMode);
  const [confirmName, setConfirmName] = useState('');
  const [archiveReason, setArchiveReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const productId = product?.id;
  const { data: usage, isLoading, error: usageError } = useProductUsageQuery(isOpen ? productId : undefined);

  const archiveMutation = useArchiveProductMutation();
  const restoreMutation = useRestoreProductMutation();
  const deleteMutation = useDeleteProductMutation();

  React.useEffect(() => {
    setActiveMode(initialMode);
    setConfirmName('');
    setArchiveReason('');
    setActionError(null);
  }, [initialMode, isOpen, product]);

  if (!isOpen || !product) return null;

  const handleArchive = async () => {
    setActionError(null);
    try {
      await archiveMutation.mutateAsync({ id: product.id, reason: archiveReason });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to archive product.');
    }
  };

  const handleRestore = async () => {
    setActionError(null);
    try {
      await restoreMutation.mutateAsync(product.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to restore product.');
    }
  };

  const handleDelete = async () => {
    if (confirmName.trim() !== product.name.trim()) {
      setActionError('Product name does not match confirmation text.');
      return;
    }
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(product.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to permanently delete product.');
    }
  };

  const isSubmitting = archiveMutation.isPending || restoreMutation.isPending || deleteMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white border border-stone-900/[0.08] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2">
            {product.is_archived ? (
              <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                ARCHIVED
              </span>
            ) : (
              <span className="text-[10px] font-extrabold uppercase bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full">
                CATALOG LIFECYCLE
              </span>
            )}
            <h2 className="text-lg font-bold text-stone-900">{product.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionError && <ErrorAlert title="Operation Error" message={actionError} />}
        {usageError && <ErrorAlert title="Usage Audit Error" message={(usageError as Error).message} />}

        {isLoading ? (
          <LoadingSpinner label="Auditing product usage & inventory references..." />
        ) : (
          <div className="space-y-5 text-xs text-stone-600">
            {/* RESTORE MODE */}
            {activeMode === 'restore' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-900">
                  <RotateCcw className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm">Restore Archived Product</h3>
                    <p className="mt-1 leading-relaxed text-xs">
                      Restoring this product will make it available for new invoices, orders, and stock movements.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleRestore} disabled={isSubmitting}>
                    {isSubmitting ? 'Restoring...' : 'Restore Product'}
                  </Button>
                </div>
              </div>
            )}

            {/* ARCHIVE OR DELETE MODES */}
            {activeMode !== 'restore' && usage && (
              <div className="space-y-5">
                {/* Transaction Usage Summary Card */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-stone-50 border border-stone-200/80 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">Invoice Items</span>
                      <span className="font-bold text-stone-900">{usage.invoice_items_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">Stock Movements</span>
                      <span className="font-bold text-stone-900">{usage.inventory_transactions_count || 0}</span>
                    </div>
                  </div>
                </div>

                {/* HISTORICAL RECORDS EXIST -> DELETION BLOCKED */}
                {usage.has_transactions && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm">Permanent Deletion Blocked</h3>
                        <p className="text-xs leading-relaxed">
                          This product appears on <strong>{usage.invoice_items_count || 0} invoice item(s)</strong> and <strong>{usage.inventory_transactions_count || 0} inventory record(s)</strong>. It cannot be permanently deleted.
                        </p>
                      </div>
                    </div>

                    <FormInput
                      label="Reason for Archiving (Optional)"
                      type="text"
                      value={archiveReason}
                      onChange={(e) => setArchiveReason(e.target.value)}
                      placeholder="e.g. Discontinued item, Replaced by new variant..."
                    />

                    <div className="p-3 bg-stone-100 rounded-xl text-[11px] text-stone-500 leading-normal">
                      <strong>Archiving will:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        <li>Hide item from new invoice dropdowns.</li>
                        <li>Keep historical pricing, invoices, and inventory logs completely intact.</li>
                      </ul>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                      <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleArchive} disabled={isSubmitting}>
                        <Archive className="w-4 h-4 mr-1.5" />
                        {isSubmitting ? 'Archiving...' : 'Archive Product'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* NO TRANSACTIONS EXIST -> PERMANENT DELETE ALLOWED */}
                {!usage.has_transactions && (
                  <div className="space-y-4">
                    {activeMode === 'delete' ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-1">
                          <h3 className="font-bold text-sm flex items-center">
                            <Trash2 className="w-4 h-4 mr-1.5 text-rose-600" />
                            Permanent Deletion Confirmation
                          </h3>
                          <p className="text-xs leading-relaxed">
                            This product has never been used in any invoice or inventory movement. It will be <strong>permanently deleted</strong>.
                          </p>
                        </div>

                        <FormInput
                          label={`Type ${product.name} to confirm:`}
                          type="text"
                          value={confirmName}
                          onChange={(e) => setConfirmName(e.target.value)}
                          placeholder={product.name}
                        />

                        <div className="flex justify-end space-x-3 pt-2">
                          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                          </Button>
                          <Button
                            variant="danger"
                            onClick={handleDelete}
                            disabled={isSubmitting || confirmName.trim() !== product.name.trim()}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-stone-600">
                          This product has no recorded transactions. You can archive it or permanently remove it from your catalog.
                        </p>
                        <div className="flex justify-end space-x-3 pt-2">
                          <Button variant="secondary" onClick={handleArchive} disabled={isSubmitting}>
                            <Archive className="w-4 h-4 mr-1.5" />
                            Archive Instead
                          </Button>
                          <Button variant="danger" onClick={() => setActiveMode('delete')} disabled={isSubmitting}>
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            Delete Permanently
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
