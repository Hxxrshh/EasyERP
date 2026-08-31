import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export const LedgerLoadingAnimation: React.FC = () => {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50">
        <div className="w-8 h-8 border-4 border-[#D4F442] border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-bold text-stone-500 uppercase tracking-widest">
          Loading Ledger...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-32 perspective-1000">
      {/* Animated Ledger Book Container */}
      <div className="relative w-48 h-64 transform-style-3d animate-ledger-book-open">
        {/* Book Cover */}
        <div className="absolute inset-0 bg-[#121316] border border-stone-800 rounded-lg shadow-2xl rounded-l-none origin-left animate-ledger-cover-open flex items-center justify-center z-20">
          <div className="text-[#D4F442] font-extrabold uppercase tracking-widest text-xs opacity-50 transform -rotate-90 origin-center whitespace-nowrap">
            ACCURA FINANCIAL LEDGER
          </div>
        </div>

        {/* Back Cover */}
        <div className="absolute inset-0 bg-[#1a1c21] rounded-lg shadow-xl z-0 rounded-l-none" />

        {/* Pages Animating */}
        <div className="absolute inset-y-1 right-1 left-4 bg-white rounded shadow-sm origin-left animate-ledger-page-turn z-10 p-4 border border-stone-100 flex flex-col gap-2">
          {/* Skeleton lines for pages */}
          <div className="w-1/2 h-3 bg-stone-200 rounded" />
          <div className="w-3/4 h-2 bg-stone-100 rounded mt-4" />
          <div className="w-full h-2 bg-stone-100 rounded" />
          <div className="w-5/6 h-2 bg-stone-100 rounded" />
          <div className="w-full h-2 bg-stone-100 rounded mt-4" />
          <div className="w-4/5 h-2 bg-stone-100 rounded" />
        </div>
        
        {/* Fast Pages Animating */}
        <div className="absolute inset-y-1 right-1 left-4 bg-[#FAF9F5] rounded shadow-sm origin-left animate-ledger-page-turn-fast z-10 p-4 border border-stone-200" />
      </div>

      <div className="mt-8 text-sm font-bold text-stone-600 uppercase tracking-widest animate-pulse">
        Retrieving Chronological Records...
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        @keyframes bookOpen {
          0% { transform: rotateY(0deg) rotateX(10deg); }
          100% { transform: rotateY(20deg) rotateX(10deg); }
        }
        @keyframes coverOpen {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(-130deg); }
        }
        @keyframes pageTurn {
          0% { transform: rotateY(0deg); opacity: 1; }
          100% { transform: rotateY(-120deg); opacity: 0; }
        }
        .animate-ledger-book-open {
          animation: bookOpen 1s ease-out forwards;
        }
        .animate-ledger-cover-open {
          animation: coverOpen 1s ease-out forwards;
        }
        .animate-ledger-page-turn {
          animation: pageTurn 2s infinite linear;
          animation-delay: 0.5s;
        }
        .animate-ledger-page-turn-fast {
          animation: pageTurn 1.5s infinite linear;
          animation-delay: 1.2s;
        }
      `}</style>
    </div>
  );
};
