import React, { useState } from 'react';
import type { Client } from '../../types';
import {
  useClientUsageQuery,
  useArchiveClientMutation,
  useRestoreClientMutation,
  useDeleteClientMutation,
} from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import { FormInput } from '../ui/FormInput';
import { AlertTriangle, Archive, RotateCcw, Trash2, X, FileText, CreditCard, Calendar, DollarSign } from 'lucide-react';

interface ClientActionModalProps {
  isOpen: boolean;
  client: Client | null;
  mode: 'archive' | 'delete' | 'restore';
  onClose: () => void;
  onSuccess?: () => void;
}

export const ClientActionModal: React.FC<ClientActionModalProps> = ({
  isOpen,
  client,
  mode: initialMode,
  onClose,
  onSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<'archive' | 'delete' | 'restore'>(initialMode);
  const [confirmName, setConfirmName] = useState('');
  const [archiveReason, setArchiveReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const clientId = client?.id;
  const { data: usage, isLoading, error: usageError } = useClientUsageQuery(isOpen ? clientId : undefined);

  const archiveMutation = useArchiveClientMutation();
  const restoreMutation = useRestoreClientMutation();
  const deleteMutation = useDeleteClientMutation();

  React.useEffect(() => {
    setActiveMode(initialMode);
    setConfirmName('');
    setArchiveReason('');
    setActionError(null);
  }, [initialMode, isOpen, client]);

  if (!isOpen || !client) return null;

  const handleArchive = async () => {
    setActionError(null);
    try {
      await archiveMutation.mutateAsync({ id: client.id, reason: archiveReason });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to archive customer.');
    }
  };

  const handleRestore = async () => {
    setActionError(null);
    try {
      await restoreMutation.mutateAsync(client.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to restore customer.');
    }
  };

  const handleDelete = async () => {
    if (confirmName.trim() !== client.name.trim()) {
      setActionError('Customer name does not match confirmation text.');
      return;
    }
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(client.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to permanently delete customer.');
    }
  };

  const isSubmitting = archiveMutation.isPending || restoreMutation.isPending || deleteMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white border border-stone-900/[0.08] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2">
            {client.is_archived ? (
              <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                ARCHIVED
              </span>
            ) : (
              <span className="text-[10px] font-extrabold uppercase bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full">
                MANAGEMENT
              </span>
            )}
            <h2 className="text-lg font-bold text-stone-900">{client.name}</h2>
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
          <LoadingSpinner label="Auditing customer usage & relationships..." />
        ) : (
          <div className="space-y-5 text-xs text-stone-600">
            {/* RESTORE MODE */}
            {activeMode === 'restore' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-900">
                  <RotateCcw className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm">Restore Archived Customer</h3>
                    <p className="mt-1 leading-relaxed text-xs">
                      Restoring this customer will re-enable them for new quotations, challans, and tax invoices.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleRestore} disabled={isSubmitting}>
                    {isSubmitting ? 'Restoring...' : 'Restore Customer'}
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
                    <FileText className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">Invoices / Docs</span>
                      <span className="font-bold text-stone-900">{usage.invoices_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">Payments</span>
                      <span className="font-bold text-stone-900">{usage.payments_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">Outstanding</span>
                      <span className="font-bold text-stone-900">₹{(usage.outstanding_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    <div>
                      <span className="text-[10px] text-stone-400 font-mono block">Last Transaction</span>
                      <span className="font-bold text-stone-900">{usage.last_transaction_date || 'None'}</span>
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
                          Customer cannot be permanently deleted because historical accounting transactions exist.
                        </p>
                      </div>
                    </div>

                    <FormInput
                      label="Reason for Archiving (Optional)"
                      type="text"
                      value={archiveReason}
                      onChange={(e) => setArchiveReason(e.target.value)}
                      placeholder="e.g. Account closed, Merged with another entity..."
                    />

                    <div className="p-3 bg-stone-100 rounded-xl text-[11px] text-stone-500 leading-normal">
                      <strong>Archiving will:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        <li>Disable selection on new invoices/payments.</li>
                        <li>Preserve all historical ledgers, invoices & reports intact.</li>
                      </ul>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                      <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={handleArchive} disabled={isSubmitting}>
                        <Archive className="w-4 h-4 mr-1.5" />
                        {isSubmitting ? 'Archiving...' : 'Archive Customer'}
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
                            This customer has no historical transactions and will be <strong>permanently deleted</strong>. This action cannot be undone.
                          </p>
                        </div>

                        <FormInput
                          label={`Type ${client.name} to confirm:`}
                          type="text"
                          value={confirmName}
                          onChange={(e) => setConfirmName(e.target.value)}
                          placeholder={client.name}
                        />

                        <div className="flex justify-end space-x-3 pt-2">
                          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                          </Button>
                          <Button
                            variant="danger"
                            onClick={handleDelete}
                            disabled={isSubmitting || confirmName.trim() !== client.name.trim()}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-stone-600">
                          This customer has no recorded invoices or payments. You can archive them or permanently remove them from the system.
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
