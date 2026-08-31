import React from 'react';

export type BadgeVariant = 'draft' | 'finalized' | 'cancelled' | 'paid' | 'partial' | 'pending' | 'overdue' | 'default' | 'lime';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant, label, className = '' }) => {
  const styles: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string; defaultLabel: string }> = {
    draft: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-900',
      border: 'border-amber-500/20',
      dot: 'bg-amber-500',
      defaultLabel: 'Draft',
    },
    finalized: {
      bg: 'bg-emerald-600/10',
      text: 'text-emerald-950',
      border: 'border-emerald-600/20',
      dot: 'bg-emerald-600',
      defaultLabel: 'Finalized',
    },
    cancelled: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-950',
      border: 'border-rose-500/20',
      dot: 'bg-rose-500',
      defaultLabel: 'Cancelled',
    },
    paid: {
      bg: 'bg-emerald-600/10',
      text: 'text-emerald-950',
      border: 'border-emerald-600/20',
      dot: 'bg-emerald-600',
      defaultLabel: 'Paid',
    },
    partial: {
      bg: 'bg-sky-500/10',
      text: 'text-sky-950',
      border: 'border-sky-500/20',
      dot: 'bg-sky-500',
      defaultLabel: 'Partial',
    },
    pending: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-900',
      border: 'border-amber-500/20',
      dot: 'bg-amber-500',
      defaultLabel: 'Pending',
    },
    overdue: {
      bg: 'bg-rose-600/15',
      text: 'text-rose-950',
      border: 'border-rose-600/30',
      dot: 'bg-rose-600 animate-pulse',
      defaultLabel: 'Overdue',
    },
    lime: {
      bg: 'bg-[#D4F442]/20',
      text: 'text-stone-900',
      border: 'border-[#D4F442]/40',
      dot: 'bg-[#98B817]',
      defaultLabel: 'Active',
    },
    default: {
      bg: 'bg-stone-500/10',
      text: 'text-stone-800',
      border: 'border-stone-500/20',
      dot: 'bg-stone-500',
      defaultLabel: 'Status',
    },
  };

  const style = styles[variant] || styles.default;
  const displayLabel = label || style.defaultLabel;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span>{displayLabel}</span>
    </span>
  );
};
