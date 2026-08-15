import React, { type SelectHTMLAttributes, type ReactNode } from 'react';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export const FormSelect: React.FC<FormSelectProps> = ({ label, error, children, className = '', id, ...props }) => {
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-1">
      <label htmlFor={selectId} className="block text-xs font-bold text-slate-700">
        {label}
      </label>
      <select
        id={selectId}
        className={`w-full min-h-[38px] text-xs font-bold px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
          error ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}
    </div>
  );
};
