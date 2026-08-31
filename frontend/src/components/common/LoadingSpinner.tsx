import React from 'react';

export const LoadingSpinner: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-fade-in">
      <div className="relative w-9 h-9">
        <div className="w-9 h-9 border-2 border-stone-300 border-t-[#D4F442] border-r-stone-900 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-9 h-9 rounded-full bg-[#D4F442]/10 blur-xs -z-10"></div>
      </div>
      <p className="text-xs font-bold text-stone-500 tracking-tight">{label}</p>
    </div>
  );
};
