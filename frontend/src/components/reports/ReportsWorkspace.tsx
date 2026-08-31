import React, { useState } from 'react';
import { apiClient, getBaseUrl } from '../../services/apiClient';
import { downloadFile } from '../../utils/downloadFile';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export const ReportsWorkspace: React.FC = () => {
  const { activeRole } = useAuth();
  const [reportType, setReportType] = useState<string>('gstr1');
  const [startDate, setStartDate] = useState<string>('2025-04-01');
  const [endDate, setEndDate] = useState<string>('2026-03-31');
  const [financialYear, setFinancialYear] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('from', startDate);
      if (endDate) params.set('to', endDate);
      if (financialYear) params.set('financial_year', financialYear);
      params.set('format', 'json');

      const endpoint =
        reportType === 'gstr1'
          ? `/reports/gstr1?${params.toString()}`
          : reportType === 'invoices'
          ? `/reports/invoices?${params.toString()}`
          : `/reports/audit?${params.toString()}`;

      const res = await apiClient.get<any>(endpoint);
      setReportData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch report data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    setIsExporting(format);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('from', startDate);
      if (endDate) params.set('to', endDate);
      if (financialYear) params.set('financial_year', financialYear);
      params.set('format', format);

      const baseUrl = getBaseUrl();
      const endpoint =
        reportType === 'gstr1'
          ? `/reports/gstr1`
          : reportType === 'invoices'
          ? `/reports/invoices`
          : `/reports/audit`;

      const downloadUrl = `${baseUrl}${endpoint}?${params.toString()}`;
      const filename = `${reportType.toUpperCase()}_Report_${startDate || 'all'}_to_${endDate || 'all'}.${format}`;

      await downloadFile(downloadUrl, filename);
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to export ${format.toUpperCase()} report.`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              STATUTORY COMPLIANCE
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500 font-mono">
              Tax & Ledger Intelligence
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Tax & Financial Reports Center
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Statutory GSTR-1 returns (B2B, B2C, HSN tables), comprehensive Invoice Registers, and authoritative Compliance Audit logs.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {reportType === 'gstr1' && (
            <>
              <button
                onClick={() => handleExport('csv')}
                disabled={Boolean(isExporting)}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-[#D4F442] font-extrabold rounded-2xl text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-[#D4F442]" />
                <span>{isExporting === 'csv' ? 'Generating...' : 'Export GSTR-1 CSV'}</span>
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                disabled={Boolean(isExporting)}
                className="px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-extrabold rounded-2xl text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{isExporting === 'xlsx' ? 'Generating...' : 'Export XLSX'}</span>
              </button>
            </>
          )}

          {reportType === 'invoices' && (
            <>
              <button
                onClick={() => handleExport('pdf')}
                disabled={Boolean(isExporting)}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-[#D4F442] font-extrabold rounded-2xl text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4 text-[#D4F442]" />
                <span>{isExporting === 'pdf' ? 'Generating...' : 'Download PDF Register'}</span>
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                disabled={Boolean(isExporting)}
                className="px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-extrabold rounded-2xl text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{isExporting === 'xlsx' ? 'Generating...' : 'Export XLSX'}</span>
              </button>
            </>
          )}

          {reportType === 'audit' && (
            <>
              <button
                onClick={() => handleExport('pdf')}
                disabled={Boolean(isExporting)}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-[#D4F442] font-extrabold rounded-2xl text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-[#D4F442]" />
                <span>{isExporting === 'pdf' ? 'Generating...' : 'Download PDF Audit'}</span>
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                disabled={Boolean(isExporting)}
                className="px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-extrabold rounded-2xl text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{isExporting === 'xlsx' ? 'Generating...' : 'Export XLSX'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && <ErrorAlert title="Report Error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {/* Filter and Configuration Card */}
      <div className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-stone-900/[0.06] shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">Select Statutory Report</label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setReportData(null);
              }}
              className="w-full text-xs font-bold p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            >
              <option value="gstr1">GSTR-1 Monthly Return (B2B, B2C, HSN)</option>
              <option value="invoices">Invoice Register (GST Breakdown & Balances)</option>
              {(activeRole === 'admin' || activeRole === 'auditor') && (
                <option value="audit">System Security & Audit Trail Report</option>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">Financial Year (Optional)</label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="w-full text-xs font-semibold p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none"
            >
              <option value="">-- Custom Date Range --</option>
              <option value="2026-27">FY 2026-27</option>
              <option value="2025-26">FY 2025-26</option>
              <option value="2024-25">FY 2024-25</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setFinancialYear('');
              }}
              className="w-full text-xs font-semibold p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-700">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setFinancialYear('');
              }}
              className="w-full text-xs font-semibold p-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 flex items-end">
            <button
              onClick={fetchReport}
              disabled={isLoading}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#D4F442]" />
              <span>{isLoading ? 'Compiling...' : 'Generate On-Screen Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Data Visual Presentation Container */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-stone-900/[0.06] shadow-xs overflow-hidden p-6 lg:p-8 space-y-6">
        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner label="Compiling report data..." />
          </div>
        ) : !reportData ? (
          <div className="p-12 text-center text-stone-400 text-xs italic bg-stone-50/50 rounded-2xl">
            Select a report and date range above, then click <strong>"Generate On-Screen Report"</strong> to preview data.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header of Report Preview */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#1E5E41] tracking-widest">
                  Report Output Preview
                </span>
                <h3 className="text-xl font-extrabold text-stone-900 mt-0.5 capitalize">
                  {reportType === 'gstr1' ? 'GSTR-1 Statutory Return' : reportType === 'invoices' ? 'Invoice Register Statement' : 'Audit Trail Report'}
                </h3>
              </div>
              <div className="text-right text-xs text-stone-500 font-mono">
                Period: {reportData.from || startDate} → {reportData.to || endDate}
              </div>
            </div>

            {/* GSTR-1 View */}
            {reportType === 'gstr1' && (
              <div className="space-y-6">
                {/* B2B Table */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-stone-700" />
                    <span>Table 4: Registered B2B Invoices ({reportData.b2b?.length || 0})</span>
                  </h4>
                  <div className="border border-stone-100 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs text-stone-700">
                      <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] border-b border-stone-100">
                        <tr>
                          <th className="p-3">GSTIN of Recipient</th>
                          <th className="p-3">Receiver Name</th>
                          <th className="p-3">Invoice #</th>
                          <th className="p-3">Date</th>
                          <th className="p-3 text-right">Invoice Value</th>
                          <th className="p-3 text-right">Taxable Value</th>
                          <th className="p-3 text-right">IGST</th>
                          <th className="p-3 text-right">CGST</th>
                          <th className="p-3 text-right">SGST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {reportData.b2b?.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="p-3 font-mono font-bold text-stone-900">{row.customer_gstin || row.gstin}</td>
                            <td className="p-3">{row.customer_name || row.client_name}</td>
                            <td className="p-3 font-mono">{row.invoice_number}</td>
                            <td className="p-3 text-stone-500">{row.invoice_date || row.date}</td>
                            <td className="p-3 text-right font-bold text-stone-900">₹{Number(row.invoice_value || row.total_amount).toFixed(2)}</td>
                            <td className="p-3 text-right font-medium">₹{Number(row.taxable_amount).toFixed(2)}</td>
                            <td className="p-3 text-right">₹{Number(row.igst_amount || row.igst || 0).toFixed(2)}</td>
                            <td className="p-3 text-right">₹{Number(row.cgst_amount || row.cgst || 0).toFixed(2)}</td>
                            <td className="p-3 text-right">₹{Number(row.sgst_amount || row.sgst || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                        {(!reportData.b2b || reportData.b2b.length === 0) && (
                          <tr>
                            <td colSpan={9} className="p-6 text-center text-stone-400 italic">
                              No B2B registered invoices found in this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* HSN Summary Table */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-stone-700" />
                    <span>Table 12: HSN Summary of Outward Supplies ({reportData.hsn_summary?.length || 0})</span>
                  </h4>
                  <div className="border border-stone-100 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs text-stone-700">
                      <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] border-b border-stone-100">
                        <tr>
                          <th className="p-3">HSN Code</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-center">UQC</th>
                          <th className="p-3 text-right">Total Qty</th>
                          <th className="p-3 text-right">Taxable Value</th>
                          <th className="p-3 text-right">Total Tax Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {reportData.hsn_summary?.map((hsn: any, idx: number) => (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="p-3 font-mono font-bold text-stone-900">{hsn.hsn_code || 'N/A'}</td>
                            <td className="p-3">{hsn.description}</td>
                            <td className="p-3 text-center uppercase font-mono">{hsn.uqc}</td>
                            <td className="p-3 text-right font-bold">{hsn.total_quantity || hsn.total_qty}</td>
                            <td className="p-3 text-right font-bold text-stone-900">₹{Number(hsn.taxable_value).toFixed(2)}</td>
                            <td className="p-3 text-right font-extrabold text-stone-900">₹{Number(hsn.total_tax).toFixed(2)}</td>
                          </tr>
                        ))}
                        {(!reportData.hsn_summary || reportData.hsn_summary.length === 0) && (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-stone-400 italic">
                              No HSN summary items found in this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Register View */}
            {reportType === 'invoices' && (
              <div className="space-y-4">
                <div className="border border-stone-100 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] border-b border-stone-100">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">GSTIN</th>
                        <th className="p-3 text-right">Taxable</th>
                        <th className="p-3 text-right">CGST</th>
                        <th className="p-3 text-right">SGST</th>
                        <th className="p-3 text-right">IGST</th>
                        <th className="p-3 text-right">Grand Total</th>
                        <th className="p-3 text-right">Paid</th>
                        <th className="p-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {reportData.invoices?.map((inv: any, idx: number) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="p-3 text-stone-500 font-mono">{inv.date}</td>
                          <td className="p-3 font-mono font-bold text-stone-900">{inv.invoice_number}</td>
                          <td className="p-3 font-medium">{inv.client_name}</td>
                          <td className="p-3 font-mono text-[11px] text-stone-500">{inv.client_gstin || 'URP'}</td>
                          <td className="p-3 text-right font-medium">₹{Number(inv.taxable_amount).toFixed(2)}</td>
                          <td className="p-3 text-right">₹{Number(inv.cgst_amount).toFixed(2)}</td>
                          <td className="p-3 text-right">₹{Number(inv.sgst_amount).toFixed(2)}</td>
                          <td className="p-3 text-right">₹{Number(inv.igst_amount).toFixed(2)}</td>
                          <td className="p-3 text-right font-extrabold text-stone-900">₹{Number(inv.grand_total).toFixed(2)}</td>
                          <td className="p-3 text-right text-emerald-700 font-medium">₹{Number(inv.paid_amount).toFixed(2)}</td>
                          <td className="p-3 text-right font-extrabold text-rose-700">₹{Number(inv.outstanding).toFixed(2)}</td>
                        </tr>
                      ))}
                      {(!reportData.invoices || reportData.invoices.length === 0) && (
                        <tr>
                          <td colSpan={11} className="p-6 text-center text-stone-400 italic">
                            No finalized tax invoices found in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {reportData.totals && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-stone-100">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <span className="text-[10px] font-extrabold text-stone-400 uppercase">Total Taxable</span>
                      <div className="text-lg font-extrabold text-stone-900">₹{Number(reportData.totals.taxable_amount || 0).toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <span className="text-[10px] font-extrabold text-stone-400 uppercase">Total GST Output</span>
                      <div className="text-lg font-extrabold text-stone-900">₹{Number(reportData.totals.total_gst || 0).toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <span className="text-[10px] font-extrabold text-stone-400 uppercase">Total Grand Value</span>
                      <div className="text-lg font-extrabold text-stone-900">₹{Number(reportData.totals.grand_total || 0).toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <span className="text-[10px] font-extrabold text-stone-400 uppercase">Outstanding Receivables</span>
                      <div className="text-lg font-extrabold text-rose-700">₹{Number(reportData.totals.outstanding || 0).toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audit Log View */}
            {reportType === 'audit' && (
              <div className="space-y-3">
                <div className="border border-stone-100 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase text-[10px] border-b border-stone-100">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">User</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Entity Type</th>
                        <th className="p-3">Entity ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {reportData.logs?.map((log: any, idx: number) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="p-3 font-mono text-stone-500">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-3 font-bold text-stone-900">{log.user?.name || `User #${log.user_id || 'System'}`}</td>
                          <td className="p-3 font-mono font-extrabold uppercase text-[10px]">{log.action}</td>
                          <td className="p-3 font-mono text-stone-600">{(log.auditable_type || '').split('\\').pop()}</td>
                          <td className="p-3 font-mono">#{log.auditable_id}</td>
                        </tr>
                      ))}
                      {(!reportData.logs || reportData.logs.length === 0) && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-stone-400 italic">
                            No audit trail entries found in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
