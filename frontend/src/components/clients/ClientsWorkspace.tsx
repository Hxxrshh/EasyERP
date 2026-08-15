import React, { useState } from 'react';
import { useBillingStore } from '../../store/useBillingStore';
import { useMetaQuery } from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Search, BookOpen } from 'lucide-react';

export const ClientsWorkspace: React.FC = () => {
  const { setActiveTab, setSelectedClientId } = useBillingStore();
  const { data: metaData, isLoading } = useMetaQuery();
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return <LoadingSpinner label="Loading customers..." />;
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

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer Directory ({clients.length})</h2>
          <p className="text-xs text-slate-500 mt-0.5">View registered customer profiles, GSTIN details, and ledger statements.</p>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, company, GSTIN..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Company Name</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3">State</th>
                <th className="p-3">Due Days</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{client.name}</td>
                  <td className="p-3 font-medium text-slate-700">{client.company_name || 'Individual'}</td>
                  <td className="p-3 font-mono font-bold text-slate-800">{client.gst_number || 'URP (Unregistered)'}</td>
                  <td className="p-3">{client.state}</td>
                  <td className="p-3">{client.default_due_days} days</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleOpenLedger(client.id)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-bold flex items-center justify-center space-x-1 mx-auto transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>View Ledger</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                    No customers found matching search criteria.
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
