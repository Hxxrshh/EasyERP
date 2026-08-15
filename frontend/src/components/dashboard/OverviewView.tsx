import React from 'react';
import { useBillingStore } from '../../store/useBillingStore';
import { useMetaQuery, useInvoicesQuery } from '../../hooks/useApiQueries';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  FilePlus,
  CreditCard,
  BookOpen,
  FileText,
  AlertCircle,
  Clock,
} from 'lucide-react';

export const OverviewView: React.FC = () => {
  const { setActiveTab } = useBillingStore();
  const { data: metaData, isLoading: isMetaLoading } = useMetaQuery();
  const { data: invoicesData, isLoading: isInvoicesLoading } = useInvoicesQuery();

  if (isMetaLoading || isInvoicesLoading) {
    return <LoadingSpinner label="Loading operational overview..." />;
  }

  const invoices = invoicesData?.data || [];
  const pendingInvoices = invoices.filter((i) => i.status === 'finalized' && i.total_amount - i.paid_amount > 0);
  const totalOutstanding = pendingInvoices.reduce((sum, i) => sum + (i.total_amount - i.paid_amount), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Operational Summary */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Operational Overview</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time receivables, pending collections, and quick billing actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('billing')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            <span>Create New Bill</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>View Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Tax Reports</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding Receivables</div>
          <div className="text-2xl font-extrabold text-slate-900">₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-amber-600 font-medium flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{pendingInvoices.length} unpaid / partial finalized bills</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Customers</div>
          <div className="text-2xl font-extrabold text-slate-900">{metaData?.clients.length || 0}</div>
          <div className="text-[11px] text-slate-400 font-medium">Registered in organization</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Catalog</div>
          <div className="text-2xl font-extrabold text-slate-900">{metaData?.products.length || 0}</div>
          <div className="text-[11px] text-slate-400 font-medium">With configured GST rates & HSN</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents</div>
          <div className="text-2xl font-extrabold text-slate-900">{invoicesData?.total || 0}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Quotes, Proformas, Invoices</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Collections & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Collections */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Pending Collections ({pendingInvoices.length})</h3>
            <button onClick={() => setActiveTab('ledger')} className="text-xs text-blue-600 font-bold hover:underline">
              View All Ledgers →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-2">Invoice #</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">Outstanding</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingInvoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="p-2 font-medium">{inv.client?.name}</td>
                    <td className="p-2 text-right font-medium">₹{inv.total_amount}</td>
                    <td className="p-2 text-right font-bold text-rose-600">₹{(inv.total_amount - inv.paid_amount).toFixed(2)}</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => setActiveTab('payments')}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700"
                      >
                        Collect
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                      No pending collections.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Billing Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Recent Billing Activity</h3>
            <button onClick={() => setActiveTab('documents')} className="text-xs text-blue-600 font-bold hover:underline">
              View All Documents →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="p-2">Doc #</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Date</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-slate-900">{inv.invoice_number || 'Draft'}</td>
                    <td className="p-2 uppercase font-bold text-slate-500">{inv.document_type}</td>
                    <td className="p-2">{inv.date}</td>
                    <td className="p-2 text-right font-bold text-slate-800">₹{inv.total_amount}</td>
                    <td className="p-2 font-bold capitalize">
                      <span className={inv.status === 'finalized' ? 'text-emerald-600' : inv.status === 'cancelled' ? 'text-rose-600' : 'text-amber-600'}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                      No documents created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
