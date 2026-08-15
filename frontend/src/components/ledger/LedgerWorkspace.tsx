import React, { useState } from 'react';
import { useBillingStore } from '../../store/useBillingStore';
import { useMetaQuery, useLedgerQuery } from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { BookOpen, FileSpreadsheet, FileText, Calendar } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const LedgerWorkspace: React.FC = () => {
  const { selectedClientId, setSelectedClientId } = useBillingStore();
  const { data: metaData, isLoading: isMetaLoading } = useMetaQuery();

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  // Auto select first client if none selected
  const activeClientId = selectedClientId || (metaData?.clients[0]?.id ?? undefined);
  const { data: ledgerData, isLoading: isLedgerLoading, error } = useLedgerQuery(activeClientId, from, to);

  if (isMetaLoading) {
    return <LoadingSpinner label="Loading customer ledger metadata..." />;
  }

  const handleApplyFY = (fy: string) => {
    if (fy === '2026-27') {
      setFrom('2026-04-01');
      setTo('2027-03-31');
    }
  };

  const handleExport = (format: 'pdf' | 'xlsx') => {
    if (!activeClientId) return;
    const token = localStorage.getItem('auth_token');
    const orgId = localStorage.getItem('active_organization_id');

    const queryParams = new URLSearchParams();
    queryParams.set('format', format);
    if (from) queryParams.set('from', from);
    if (to) queryParams.set('to', to);

    const exportUrl = `${BASE_URL}/ledgers/${activeClientId}/export?${queryParams.toString()}`;

    // Download file via fetch blob
    fetch(exportUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Organization-Id': orgId || '',
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ledger_Client_${activeClientId}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Failed to download export file.'));
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Authoritative Customer Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">Chronological double-entry debit/credit ledger statement & opening/closing balance engine.</p>
        </div>

        {/* Exports & Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={!activeClientId}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF Statement</span>
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={!activeClientId}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase">Select Customer</label>
            <select
              value={activeClientId || ''}
              onChange={(e) => setSelectedClientId(Number(e.target.value))}
              className="text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-slate-900 min-w-[220px]"
            >
              {metaData?.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_name || c.state})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase">To Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleApplyFY('2026-27')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>FY 2026-27</span>
          </button>
          {(from || to) && (
            <button
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className="px-3 py-1.5 text-xs text-rose-600 font-bold hover:underline"
            >
              Reset Dates
            </button>
          )}
        </div>
      </div>

      {error && <ErrorAlert title="Ledger Error" message={(error as Error).message} />}

      {/* Ledger Table & Summary Box */}
      {isLedgerLoading ? (
        <LoadingSpinner label="Querying ledger records..." />
      ) : ledgerData ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          {/* Opening Balance Banner */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="font-bold text-slate-700 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Customer: {ledgerData.client.name} ({ledgerData.client.company_name || 'Individual'})</span>
            </div>
            <div className="text-slate-600 font-medium">
              Opening Balance: <strong className="text-slate-900 font-extrabold">₹{Number(ledgerData.opening_balance).toFixed(2)}</strong>
            </div>
          </div>

          {/* Statement Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Doc / Ref #</th>
                  <th className="p-3">Particulars / Description</th>
                  <th className="p-3 text-right">Debit (Dr ₹)</th>
                  <th className="p-3 text-right">Credit (Cr ₹)</th>
                  <th className="p-3 text-right">Balance (₹)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ledgerData.statement.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{entry.date}</td>
                    <td className="p-3 uppercase font-bold text-slate-500">{entry.entry_type}</td>
                    <td className="p-3 font-bold text-slate-900">{entry.invoice_number || entry.transaction_reference || 'N/A'}</td>
                    <td className="p-3">{entry.description}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {entry.debit > 0 ? `₹${Number(entry.debit).toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600">
                      {entry.credit > 0 ? `₹${Number(entry.credit).toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-right font-extrabold text-slate-900">
                      ₹{Number(entry.running_balance).toFixed(2)}
                    </td>
                    <td className="p-3 text-center font-bold capitalize">
                      <span
                        className={
                          entry.status === 'Paid'
                            ? 'text-emerald-600'
                            : entry.status === 'Partial'
                            ? 'text-amber-600'
                            : entry.status === 'Overdue'
                            ? 'text-rose-600 font-extrabold'
                            : 'text-slate-500'
                        }
                      >
                        {entry.status || '-'}
                      </span>
                    </td>
                  </tr>
                ))}

                {ledgerData.statement.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                      No ledger transactions recorded in selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Closing Outstanding Banner */}
          <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="font-semibold text-slate-400">Statement Closing Summary</div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase mr-2">Closing Outstanding Balance:</span>
              <span className="text-lg font-extrabold text-emerald-400">
                ₹{Number(ledgerData.current_outstanding).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
