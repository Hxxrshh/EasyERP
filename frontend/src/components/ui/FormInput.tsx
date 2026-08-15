import React, { type InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, error, className = '', id, ...props }) => {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-xs font-bold text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full min-h-[38px] text-xs font-bold px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}
    </div>
  );
};
