import React, { type SelectHTMLAttributes, type ReactNode } from 'react';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  error,
  children,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-[11px] font-bold text-stone-700 tracking-tight">
        {label}
      </label>
      <select
        id={selectId}
        className={`w-full min-h-[38px] text-xs font-semibold px-3.5 py-2 border rounded-xl bg-white/90 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all duration-150 cursor-pointer ${
          error ? 'border-rose-400 bg-rose-50/50 text-rose-900' : 'border-stone-200 hover:border-stone-300'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[10px] text-rose-600 font-bold">{error}</p>}
    </div>
  );
};
