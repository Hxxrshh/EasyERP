import React, { useState } from 'react';
import { useLedgerStatementQuery, useMetaQuery } from '../../hooks/useApiQueries';
import { uiEventBus } from '../../services/uiEventBus';
import { downloadFile } from '../../utils/downloadFile';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { LedgerLoadingAnimation } from './LedgerLoadingAnimation';
import { ErrorAlert } from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import {
  Download,
  Receipt,
  Search,
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const LedgerWorkspace: React.FC = () => {
  const { data: metaData, isLoading: isMetaLoading } = useMetaQuery();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [isExcelDownloading, setIsExcelDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Automatically select first client if none selected
  React.useEffect(() => {
    if (!selectedClientId && metaData?.clients && metaData.clients.length > 0) {
      setSelectedClientId(metaData.clients[0].id);
    }
  }, [metaData, selectedClientId]);

  const {
    data: ledgerData,
    isLoading: isLedgerLoading,
    error: ledgerError,
    isFetching: isLedgerFetching,
  } = useLedgerStatementQuery(selectedClientId, startDate, endDate);

  React.useEffect(() => {
    if (isLedgerFetching) {
      uiEventBus.emit({ type: 'LEDGER_LOADING' });
    } else if (ledgerData && selectedClientId) {
      uiEventBus.emit({ type: 'LEDGER_READY' });
    }
  }, [isLedgerFetching, ledgerData, selectedClientId]);

  const handleDownloadPdf = async () => {
    if (!selectedClientId) return;
    setIsPdfDownloading(true);
    try {
      const params = new URLSearchParams();
      params.set('format', 'pdf');
      if (startDate) params.set('from', startDate);
      if (endDate) params.set('to', endDate);
      const url = `${BASE_URL}/ledgers/${selectedClientId}/export?${params.toString()}`;
      await downloadFile(url, `Ledger_Statement_${selectedClientId}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!selectedClientId) return;
    setIsExcelDownloading(true);
    try {
      const params = new URLSearchParams();
      params.set('format', 'xlsx');
      if (startDate) params.set('from', startDate);
      if (endDate) params.set('to', endDate);
      const url = `${BASE_URL}/ledgers/${selectedClientId}/export?${params.toString()}`;
      await downloadFile(url, `Ledger_Statement_${selectedClientId}.xlsx`);
    } catch (err) {
      console.error('Excel export error:', err);
    } finally {
      setIsExcelDownloading(false);
    }
  };

  const setFinancialYear = (yearStart: number) => {
    setStartDate(`${yearStart}-04-01`);
    setEndDate(`${yearStart + 1}-03-31`);
  };

  if (isMetaLoading) {
    return <LoadingSpinner label="Loading customer ledger directory..." />;
  }

  const clients = metaData?.clients || [];
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const statement = ledgerData?.statement || [];

  const filteredStatement = statement.filter((entry: any) =>
    (entry.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.invoice_number && entry.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (entry.transaction_reference && entry.transaction_reference.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              DOUBLE-ENTRY LEDGER
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500 font-mono">
              Running Balance Ledger
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Authoritative Customer Ledger
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Forensically reconciled double-entry chronological running balance of all finalized invoices, credit entries, and allocated payments.
          </p>
        </div>

        {/* Action Exports */}
        <div className="flex items-center space-x-3 shrink-0">
          <Button
            variant="ghost"
            onClick={handleDownloadExcel}
            isLoading={isExcelDownloading}
            icon={<Download className="w-4 h-4 text-stone-700" />}
          >
            Export CSV / Excel
          </Button>

          <Button
            variant="primary"
            onClick={handleDownloadPdf}
            isLoading={isPdfDownloading}
            icon={<Download className="w-4 h-4 text-stone-950" />}
          >
            Download Official Statement PDF
          </Button>
        </div>
      </div>

      {ledgerError && <ErrorAlert title="Ledger Error" message={(ledgerError as Error).message} />}

      {/* Client Selector & Date Range Filter Bar */}
      <div className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-stone-900/[0.06] shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">Select Customer Account</label>
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(Number(e.target.value))}
              className="w-full text-xs font-bold p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_name || 'Individual'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">Statement Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">Statement End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">Financial Year Shortcuts</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFinancialYear(2025)}
                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-xl text-[11px] transition-colors cursor-pointer"
              >
                FY 25-26
              </button>
              <button
                type="button"
                onClick={() => setFinancialYear(2024)}
                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-xl text-[11px] transition-colors cursor-pointer"
              >
                FY 24-25
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-xl text-[11px] transition-colors cursor-pointer"
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Selected Customer Snapshot Banner */}
        {selectedClient && (
          <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-900/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-0.5">
              <div className="font-extrabold text-stone-900 text-sm">{selectedClient.name}</div>
              <div className="text-stone-500 text-[11px]">
                GSTIN: <strong className="text-stone-800 font-mono">{selectedClient.gst_number || 'URP'}</strong> • State: {selectedClient.state} • Terms: {selectedClient.default_due_days} Days
              </div>
            </div>

            <div className="flex items-center space-x-6 text-right">
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Opening Balance</span>
                <span className="font-bold text-stone-900 text-sm">
                  ₹{Number(ledgerData?.opening_balance || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Current Outstanding</span>
                <span className="font-extrabold text-rose-600 text-base">
                  ₹{Number(ledgerData?.current_outstanding || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLedgerFetching ? (
        <LedgerLoadingAnimation />
      ) : (
        <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-stone-900/[0.06] shadow-xs overflow-hidden space-y-4 p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-stone-900 text-sm tracking-tight flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-stone-700" />
            <span>Chronological Running Ledger ({filteredStatement.length} Entries)</span>
          </h3>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description or ref..."
              className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        {isLedgerLoading ? (
          <LoadingSpinner label="Calculating double-entry running balance..." />
        ) : (
          <div className="overflow-x-auto border border-stone-900/[0.06] rounded-2xl bg-white">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-900/[0.05]">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Transaction Particulars</th>
                  <th className="p-3.5">Reference #</th>
                  <th className="p-3.5 text-right text-rose-700">Debit (Billed ₹)</th>
                  <th className="p-3.5 text-right text-emerald-800">Credit (Paid ₹)</th>
                  <th className="p-3.5 text-right font-black">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {filteredStatement.map((entry: any, idx: number) => {
                  return (
                    <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-3.5 font-mono text-stone-500 text-[11px] whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-stone-900">{entry.description}</div>
                        {entry.due_date && (
                          <div className="text-[10px] text-stone-400">Due Date: {entry.due_date}</div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-stone-600">
                        {entry.invoice_number || entry.transaction_reference || '—'}
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-stone-900">
                        {entry.debit > 0 ? `₹${Number(entry.debit).toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-[#1E5E41]">
                        {entry.credit > 0 ? `₹${Number(entry.credit).toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3.5 text-right font-black text-stone-900 text-sm">
                        ₹{Number(entry.running_balance).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {filteredStatement.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-stone-400 italic">
                      No ledger transactions found for this customer and date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
