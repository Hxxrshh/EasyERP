import React from 'react';

export type BadgeVariant = 'draft' | 'finalized' | 'cancelled' | 'paid' | 'partial' | 'pending' | 'overdue' | 'default';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant, label }) => {
  const styles: Record<BadgeVariant, { bg: string; text: string; border: string; defaultLabel: string }> = {
    draft: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', defaultLabel: 'Draft' },
    finalized: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', defaultLabel: 'Finalized' },
    cancelled: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', defaultLabel: 'Cancelled' },
    paid: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', defaultLabel: 'Paid' },
    partial: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', defaultLabel: 'Partial' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', defaultLabel: 'Pending' },
    overdue: { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300', defaultLabel: 'Overdue' },
    default: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', defaultLabel: 'Status' },
  };

  const style = styles[variant] || styles.default;
  const displayLabel = label || style.defaultLabel;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}
    >
      {displayLabel}
    </span>
  );
};
