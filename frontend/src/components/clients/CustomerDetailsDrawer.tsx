import React, { useState } from 'react';
import { useLedgerStatementQuery, useInvoicesQuery } from '../../hooks/useApiQueries';
import type { Client } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../ui/Badge';
import {
  X,
  Building2,
  Receipt,
  FileCheck,
} from 'lucide-react';

interface CustomerDetailsDrawerProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLedger: (clientId: number) => void;
}

export const CustomerDetailsDrawer: React.FC<CustomerDetailsDrawerProps> = ({
  client,
  isOpen,
  onClose,
  onOpenLedger,
}) => {
  const { data: ledgerData, isLoading: isLoadingLedger } = useLedgerStatementQuery(
    client?.id || null
  );
  const { data: invoicesData } = useInvoicesQuery({ client_id: client?.id });
  const [activeTab, setActiveTab] = useState<'profile' | 'invoices' | 'aging'>('profile');

  if (!isOpen || !client) return null;

  const invoices = invoicesData?.data || [];
  const outstandingAmount = Number(ledgerData?.current_outstanding || 0);

  // Compute Aging Brackets
  const today = new Date();
  const aging = {
    current: 0,
    days30: 0,
    days60: 0,
    days90Plus: 0,
  };

  invoices.forEach((inv) => {
    if (inv.status === 'finalized' && Number(inv.total_amount) > Number(inv.paid_amount)) {
      const openAmt = Number(inv.total_amount) - Number(inv.paid_amount);
      const invDate = new Date(inv.date);
      const diffDays = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 30) aging.current += openAmt;
      else if (diffDays <= 60) aging.days30 += openAmt;
      else if (diffDays <= 90) aging.days60 += openAmt;
      else aging.days90Plus += openAmt;
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-[#FAF9F5] h-full shadow-2xl flex flex-col justify-between border-l border-stone-900/[0.08] animate-slide-in-right">
        {/* Drawer Header */}
        <div className="p-6 bg-[#121316] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4F442] flex items-center justify-center text-stone-950 font-extrabold text-sm">
              {client.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight text-[#FAF9F5]">{client.name}</h2>
              <p className="text-xs text-stone-400 font-medium">
                {client.company_name || 'Individual'} • State: {client.state}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-900/[0.06] bg-white text-xs font-bold text-stone-500 px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 mr-6 border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-stone-900 text-stone-900 font-extrabold'
                : 'border-transparent hover:text-stone-700'
            }`}
          >
            Profile & Terms
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3.5 mr-6 border-b-2 transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'border-stone-900 text-stone-900 font-extrabold'
                : 'border-transparent hover:text-stone-700'
            }`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('aging')}
            className={`py-3.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'aging'
                ? 'border-stone-900 text-stone-900 font-extrabold'
                : 'border-transparent hover:text-stone-700'
            }`}
          >
            Aging Analysis
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs custom-scrollbar">
          {/* Outstanding Balance Banner */}
          <div className="p-5 bg-stone-900 text-white rounded-3xl flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[10px] text-stone-400 font-extrabold uppercase tracking-widest">
                Net Outstanding Receivables
              </div>
              <div className="text-2xl font-extrabold text-[#D4F442] mt-0.5">
                ₹{outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <button
              onClick={() => onOpenLedger(client.id)}
              className="px-3.5 py-1.5 bg-[#FAF9F5] hover:bg-white text-stone-900 font-extrabold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Full Ledger</span>
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-white/80 border border-stone-900/[0.06] rounded-3xl p-5 space-y-4">
                <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-stone-600" />
                  <span>Business Tax & Terms</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 text-stone-600">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase">GSTIN / Tax ID</span>
                    <p className="font-mono font-bold text-stone-900">{client.gst_number || 'URP (Unregistered)'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase">Place of Supply</span>
                    <p className="font-bold text-stone-900">{client.state}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase">Credit Period</span>
                    <p className="font-bold text-stone-900">{client.default_due_days} Days</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase">Preferred Template</span>
                    <p className="font-bold text-stone-900 capitalize">{client.preferred_template || 'Default'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 space-y-1">
                  <span className="text-[10px] font-extrabold text-stone-400 uppercase">Billing Address</span>
                  <p className="font-medium text-stone-800 leading-relaxed">
                    {client.billing_address || 'No billing address provided.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-stone-400 bg-white/80 rounded-3xl border border-stone-900/[0.06] italic">
                  No invoices generated for this client yet.
                </div>
              ) : (
                invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 bg-white/80 border border-stone-900/[0.06] rounded-2xl flex items-center justify-between hover:border-stone-900/[0.12] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-stone-900">
                          {inv.invoice_number || `Draft #${inv.id}`}
                        </span>
                        <Badge variant={inv.status as any} />
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Dated: {inv.date} • {inv.document_type.toUpperCase()}
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="font-extrabold text-stone-900 text-sm">
                        ₹{Number(inv.total_amount).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        Paid: ₹{Number(inv.paid_amount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'aging' && (
            <div className="space-y-4">
              {isLoadingLedger ? (
                <LoadingSpinner label="Calculating receivables aging..." />
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-white/80 border border-stone-900/[0.06] rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-stone-800">Current (0 - 30 Days)</div>
                      <div className="text-[10px] text-stone-400">Within standard terms</div>
                    </div>
                    <span className="font-extrabold text-stone-900 text-sm">₹{aging.current.toFixed(2)}</span>
                  </div>

                  <div className="p-4 bg-white/80 border border-stone-900/[0.06] rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-stone-800">31 - 60 Days</div>
                      <div className="text-[10px] text-stone-400">Mild overdue</div>
                    </div>
                    <span className="font-extrabold text-stone-900 text-sm">₹{aging.days30.toFixed(2)}</span>
                  </div>

                  <div className="p-4 bg-white/80 border border-stone-900/[0.06] rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-stone-800">61 - 90 Days</div>
                      <div className="text-[10px] text-stone-400">Follow-up recommended</div>
                    </div>
                    <span className="font-extrabold text-stone-900 text-sm">₹{aging.days60.toFixed(2)}</span>
                  </div>

                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-rose-950">90+ Days (Critical)</div>
                      <div className="text-[10px] text-rose-800">Immediate recovery action</div>
                    </div>
                    <span className="font-extrabold text-rose-950 text-sm">₹{aging.days90Plus.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-900/[0.06] flex items-center justify-between">
          <button
            onClick={() => onOpenLedger(client.id)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-[#D4F442] font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            <span>Generate Official Ledger Statement</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl border border-stone-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
