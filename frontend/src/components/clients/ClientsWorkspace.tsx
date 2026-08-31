import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBillingStore } from '../../store/useBillingStore';
import { useMetaQuery } from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Button } from '../ui/Button';
import { ShortcutHint } from '../ui/ShortcutHint';
import { CreateClientModal } from './CreateClientModal';
import { CustomerDetailsDrawer } from './CustomerDetailsDrawer';
import { ClientActionModal } from './ClientActionModal';
import type { Client } from '../../types';
import {
  Search,
  BookOpen,
  FilePlus,
  CreditCard,
  UserPlus,
  UserCheck,
  ArrowUpRight,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export const ClientsWorkspace: React.FC = () => {
  const { activeRole } = useAuth();
  const { setActiveTab, setSelectedClientId } = useBillingStore();
  const [showArchived, setShowArchived] = useState(false);
  const { data: metaData, isLoading } = useMetaQuery(showArchived);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedDrawerClientId, setSelectedDrawerClientId] = useState<number | null>(null);

  // Lifecycle Action Modal state
  const [selectedActionClient, setSelectedActionClient] = useState<Client | null>(null);
  const [actionModalMode, setActionModalMode] = useState<'archive' | 'delete' | 'restore'>('archive');

  if (isLoading) {
    return <LoadingSpinner label="Loading customer directory..." />;
  }

  const clients = metaData?.clients || [];
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.gst_number && c.gst_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenLedger = (clientId: number) => {
    setSelectedClientId(clientId);
    setActiveTab('ledger');
  };

  const handleNewInvoiceForClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setActiveTab('billing');
  };

  const handleRecordPaymentForClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setActiveTab('payments');
  };

  const handleOpenActionModal = (client: Client, mode: 'archive' | 'delete' | 'restore') => {
    setSelectedActionClient(client);
    setActionModalMode(mode);
  };

  return (
    <div className="space-y-8">
      <CreateClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={(id) => {
          setSelectedClientId(id);
        }}
      />

      <CustomerDetailsDrawer
        isOpen={!!selectedDrawerClientId}
        client={clients.find((c) => c.id === selectedDrawerClientId) || null}
        onClose={() => setSelectedDrawerClientId(null)}
        onOpenLedger={(id) => {
          setSelectedClientId(id);
          setActiveTab('ledger');
        }}
      />

      <ClientActionModal
        isOpen={Boolean(selectedActionClient)}
        client={selectedActionClient}
        mode={actionModalMode}
        onClose={() => setSelectedActionClient(null)}
      />

      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              CRM DIRECTORY
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500">{clients.length} Registered Accounts</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Customer Directory & Accounts
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Manage customer profiles, GSTIN registrations, default credit terms, historical pricing intelligence, and ledger statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Show Archived Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center space-x-1.5 ${
              showArchived
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
          </button>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer, GSTIN..."
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-stone-200 rounded-xl bg-white/90 focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-900 font-semibold placeholder:text-stone-400"
            />
          </div>

          {activeRole !== 'auditor' && (
            <Button
              variant="primary"
              onClick={() => setIsClientModalOpen(true)}
              icon={<UserPlus className="w-4 h-4 text-stone-950" />}
            >
              <span>New Customer</span>
              <ShortcutHint type="newClient" className="ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Customer Directory List / Specimen Table */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-stone-900/[0.06] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-900/[0.05]">
              <tr>
                <th className="p-4">Customer & Trade Identity</th>
                <th className="p-4">Company Name</th>
                <th className="p-4">GSTIN Details</th>
                <th className="p-4">State</th>
                <th className="p-4">Credit Terms</th>
                <th className="p-4 text-right">Actions & Lifecycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className={`transition-colors group ${
                    client.is_archived ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-stone-50/50'
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedDrawerClientId(client.id)}
                        className="font-extrabold text-stone-900 hover:text-stone-950 text-left cursor-pointer flex items-center space-x-1.5"
                      >
                        <span className="text-sm">{client.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                      {client.is_archived && (
                        <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    {client.short_name && (
                      <span className="text-[10px] text-stone-400 font-mono">Code: {client.short_name}</span>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-stone-800">{client.company_name || 'Individual'}</td>
                  <td className="p-4 font-mono font-bold text-stone-700">
                    {client.gst_number ? (
                      <span className="px-2 py-0.5 bg-stone-100 rounded-md border border-stone-200 text-[11px]">
                        {client.gst_number}
                      </span>
                    ) : (
                      <span className="text-stone-400">URP (Unregistered)</span>
                    )}
                  </td>
                  <td className="p-4 font-medium text-stone-600">{client.state}</td>
                  <td className="p-4 font-bold text-stone-800">{client.default_due_days} days</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => setSelectedDrawerClientId(client.id)}
                        title="View Full Profile & Aging Metrics"
                        className="px-2 py-1 bg-stone-100 hover:bg-stone-200/80 text-stone-800 border border-stone-200 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-stone-600" />
                        <span>Profile</span>
                      </button>

                      {!client.is_archived && activeRole !== 'auditor' && (
                        <>
                          <button
                            onClick={() => handleNewInvoiceForClient(client.id)}
                            title="Create Bill for Customer"
                            className="px-2 py-1 bg-[#D4F442]/20 hover:bg-[#D4F442] text-stone-950 border border-[#D4F442]/40 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                            <span>Bill</span>
                          </button>

                          <button
                            onClick={() => handleRecordPaymentForClient(client.id)}
                            title="Record Payment from Customer"
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Payment</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleOpenLedger(client.id)}
                        title="View Ledger Statement"
                        className="px-2 py-1 bg-stone-100 hover:bg-stone-200/80 text-stone-800 border border-stone-200 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                        <span>Ledger</span>
                      </button>

                      {/* Admin Lifecycle Actions */}
                      {activeRole === 'admin' && (
                        <>
                          {client.is_archived ? (
                            <button
                              onClick={() => handleOpenActionModal(client, 'restore')}
                              title="Restore Customer"
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenActionModal(client, 'archive')}
                              title="Archive or Delete Customer"
                              className="p-1.5 bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 border border-stone-200 rounded-xl text-xs font-bold flex items-center cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-stone-400 italic space-y-3">
                    <div>No customers found matching search criteria.</div>
                    {activeRole !== 'auditor' && (
                      <Button variant="secondary" onClick={() => setIsClientModalOpen(true)}>
                        + Add First Customer
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
