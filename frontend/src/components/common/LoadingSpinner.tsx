import React from 'react';

export const LoadingSpinner: React.FC<{ label?: string }> = ({ label = 'Loading data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
};
