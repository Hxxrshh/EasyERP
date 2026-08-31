import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOverviewQuery } from '../../hooks/useApiQueries';
import { useBillingStore } from '../../store/useBillingStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorAlert } from '../common/ErrorAlert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  TrendingUp,
  FilePlus,
  CreditCard,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const OverviewView: React.FC = () => {
  const { activeOrganization } = useAuth();
  const { setActiveTab } = useBillingStore();
  const { data: overview, isLoading, error } = useOverviewQuery();

  if (isLoading) {
    return <LoadingSpinner label="Compiling executive financial health overview..." />;
  }

  if (error) {
    return <ErrorAlert title="Executive Dashboard Error" message={(error as Error).message} />;
  }

  const kpis = overview?.kpis || {
    total_sales: 0,
    total_payments_collected: 0,
    total_receivables: 0,
    overdue_receivables: 0,
    open_invoices_count: 0,
    overdue_invoices_count: 0,
  };

  const topDebtors = overview?.top_debtors || [];
  const recentInvoices = overview?.recent_invoices || [];

  return (
    <div className="space-y-10">
      {/* Editorial Header Statement */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-900/[0.04] px-2.5 py-1 rounded-full border border-stone-900/[0.06]">
              ORGANIZATION LEDGER CONTEXT
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442]" />
            <span className="text-[11px] font-bold text-stone-500 font-mono">
              {activeOrganization?.name}
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900">
            Financial Health & Liquidity
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Real-time aggregate financial state across invoices, payments, aging exposures, and pending ledger allocations.
          </p>
        </div>

        {/* Quick Launch Editorial Actions */}
        <div className="flex items-center space-x-3 shrink-0">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('payments')}
            icon={<CreditCard className="w-4 h-4 text-stone-700" />}
          >
            Record Payment
          </Button>

          <Button
            variant="primary"
            onClick={() => setActiveTab('billing')}
            icon={<FilePlus className="w-4 h-4 text-stone-950" />}
          >
            New Invoice
          </Button>
        </div>
      </div>

      {/* Hero Financial KPI Asymmetric Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dominant Hero Card: Net Receivables / Cash at Risk (7 Cols) */}
        <div className="lg:col-span-7 bg-[#121316] text-[#FAF9F5] rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          {/* Subtle Glow Accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4F442]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-stone-400">
                Outstanding Balance at Risk
              </span>
              <span className="px-3 py-1 bg-[#D4F442] text-[#121316] text-[10px] font-extrabold rounded-full tracking-wider uppercase">
                {kpis.open_invoices_count} Open Invoices
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#FAF9F5]">
                ₹{Number(kpis.total_receivables).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-stone-400 font-medium max-w-md pt-1">
                Authoritative balance across all debtor accounts pending FIFO settlement.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-stone-800/80 grid grid-cols-2 gap-6 text-xs">
            <div>
              <span className="text-stone-400 text-[11px] font-bold block">Overdue Exposure</span>
              <div className="text-lg font-extrabold text-rose-400 mt-0.5">
                ₹{Number(kpis.overdue_receivables).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-stone-500 font-medium">
                {kpis.overdue_invoices_count} invoices past term
              </span>
            </div>

            <div>
              <span className="text-stone-400 text-[11px] font-bold block">Healthy Receivables</span>
              <div className="text-lg font-extrabold text-[#D4F442] mt-0.5">
                ₹{(Number(kpis.total_receivables) - Number(kpis.overdue_receivables)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-stone-500 font-medium">Within due credit window</span>
            </div>
          </div>
        </div>

        {/* Supporting Secondary Metric Tiles (5 Cols) */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
          {/* Total Billed Revenue */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-stone-900/[0.06] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500">
                Gross Revenue Billed
              </span>
              <TrendingUp className="w-4 h-4 text-stone-700" />
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-extrabold text-stone-900 tracking-tight">
                ₹{Number(kpis.total_sales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Total finalized taxable & non-taxable sales in active organization
              </p>
            </div>
          </div>

          {/* Realized Cash Collections */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-stone-900/[0.06] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500">
                Realized Cash Collections
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-extrabold text-[#1E5E41] tracking-tight">
                ₹{Number(kpis.total_payments_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Settled receipts allocated via FIFO double-entry ledger
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Visual Split: Exposure Ranking vs Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Exposure Ranking / Top Debtors (5 Cols) */}
        <div className="lg:col-span-5 bg-white/80 backdrop-blur-md rounded-3xl p-6 lg:p-8 border border-stone-900/[0.06] shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-stone-900 text-base tracking-tight">
                Debtor Exposure Ranking
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">Top customer accounts by open receivables</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('customers')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              All Clients
            </Button>
          </div>

          <div className="space-y-3">
            {topDebtors.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs italic bg-stone-50/50 rounded-2xl">
                No active outstanding receivables found.
              </div>
            ) : (
              topDebtors.map((debtor: any, idx: number) => {
                const percentage =
                  Number(kpis.total_receivables) > 0
                    ? Math.min(100, Math.round((Number(debtor.outstanding) / Number(kpis.total_receivables)) * 100))
                    : 0;

                return (
                  <div
                    key={debtor.id || idx}
                    onClick={() => setActiveTab('customers')}
                    className="p-3.5 bg-stone-50/70 hover:bg-stone-100/80 rounded-2xl border border-stone-900/[0.04] transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-stone-900 group-hover:text-stone-950">
                          {debtor.name}
                        </span>
                      </div>
                      <span className="font-extrabold text-stone-900">
                        ₹{Number(debtor.outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Proportional Exposure Bar */}
                    <div className="w-full bg-stone-200/70 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-stone-900 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Invoices & Stage Registry (7 Cols) */}
        <div className="lg:col-span-7 bg-white/80 backdrop-blur-md rounded-3xl p-6 lg:p-8 border border-stone-900/[0.06] shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-stone-900 text-base tracking-tight">
                Recent Document Flow
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">Latest invoices, proformas, and challans generated</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('documents')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Document Registry
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50/80 text-stone-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-900/[0.05]">
                <tr>
                  <th className="p-3">Document #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white/50">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400 italic">
                      No recent documents recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv: any) => (
                    <tr
                      key={inv.id}
                      onClick={() => setActiveTab('documents')}
                      className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-mono font-bold text-stone-900">
                        {inv.invoice_number || `Draft #${inv.id}`}
                      </td>
                      <td className="p-3 font-semibold text-stone-800 truncate max-w-[150px]">
                        {inv.client?.name || 'Customer'}
                      </td>
                      <td className="p-3 text-right font-extrabold text-stone-900">
                        ₹{Number(inv.total_amount).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={inv.status as any} />
                      </td>
                      <td className="p-3 text-right text-stone-400 font-mono text-[11px]">
                        {inv.date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
