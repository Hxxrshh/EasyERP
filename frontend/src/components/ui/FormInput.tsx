import React, { type InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, error, className = '', id, ...props }) => {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-[11px] font-bold text-stone-700 tracking-tight">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full min-h-[38px] text-xs font-semibold px-3.5 py-2 border rounded-xl bg-white/90 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all duration-150 ${
          error ? 'border-rose-400 bg-rose-50/50 text-rose-900' : 'border-stone-200 hover:border-stone-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-rose-600 font-bold">{error}</p>}
    </div>
  );
};
