import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Download, ShieldCheck } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const ReportsWorkspace: React.FC = () => {
  const [financialYear, setFinancialYear] = useState<string>('2026-27');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const triggerDownload = (endpoint: string, filename: string) => {
    const token = localStorage.getItem('auth_token');
    const orgId = localStorage.getItem('active_organization_id');

    const queryParams = new URLSearchParams();
    if (financialYear) queryParams.set('financial_year', financialYear);
    if (fromDate) queryParams.set('from', fromDate);
    if (toDate) queryParams.set('to', toDate);

    const fullUrl = `${BASE_URL}${endpoint}?${queryParams.toString()}`;

    fetch(fullUrl, {
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
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Failed to download report export.'));
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Tax & Accounting Report Export Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">Generate authoritative GSTR-1, Invoice Register, and Audit Trail reports directly from backend server state.</p>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase">Financial Year</label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
            >
              <option value="2026-27">FY 2026-27</option>
              <option value="2025-26">FY 2025-26</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase">From Date (Custom)</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase">To Date (Custom)</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs font-bold p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Invoice Register Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 bg-blue-50 text-blue-700 w-fit rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Invoice Register Report</h3>
            <p className="text-xs text-slate-500">
              Complete register of all finalized Tax Invoices, taxable subtotals, GST tax breakdowns, paid amounts, and outstanding balances.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => triggerDownload('/reports/invoices?format=pdf', `Invoice_Register_${financialYear}.pdf`)}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Download PDF Register</span>
            </button>
            <button
              onClick={() => triggerDownload('/reports/invoices?format=xlsx', `Invoice_Register_${financialYear}.xlsx`)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* GSTR-1 Report Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 w-fit rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">GSTR-1 Tax Return Export</h3>
            <p className="text-xs text-slate-500">
              Government compliant GSTR-1 export containing B2B sales register, B2C sales summary, and HSN-wise tax summary.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => triggerDownload('/reports/gstr1?format=xlsx', `GSTR1_Export_${financialYear}.xlsx`)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Multi-Sheet Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => triggerDownload('/reports/gstr1?format=csv', `GSTR1_Export_${financialYear}.csv`)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Raw CSV</span>
            </button>
          </div>
        </div>

        {/* System Audit Report Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 bg-slate-100 text-slate-700 w-fit rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">System Audit Trail Export</h3>
            <p className="text-xs text-slate-500">
              Export system security, document creations, conversions, cancellations, and payment allocation activity logs.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => triggerDownload('/reports/audit?format=pdf', `Audit_Report_${financialYear}.pdf`)}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Download PDF Audit Log</span>
            </button>
            <button
              onClick={() => triggerDownload('/reports/audit?format=xlsx', `Audit_Report_${financialYear}.xlsx`)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
