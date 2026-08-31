import React from 'react';

interface AccuraLogoProps {
  variant?: 'full' | 'symbol' | 'wordmark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitleText?: string;
  theme?: 'dark' | 'light' | 'auto';
  className?: string;
}

export const AccuraLogo: React.FC<AccuraLogoProps> = ({
  variant = 'full',
  size = 'md',
  showSubtitle = false,
  subtitleText = 'Financial Operations Platform',
  theme = 'auto',
  className = '',
}) => {
  const sizeMap = {
    sm: { symbol: 24, text: 'text-sm', sub: 'text-[9px]' },
    md: { symbol: 32, text: 'text-base', sub: 'text-[10px]' },
    lg: { symbol: 40, text: 'text-xl', sub: 'text-xs' },
    xl: { symbol: 52, text: 'text-2xl', sub: 'text-xs' },
  };

  const { symbol: symbolSize, text: textClass, sub: subClass } = sizeMap[size];

  // The ACCURA Symbol: A precise, architectural upward chevron delta representing precision, stability, and financial accuracy.
  const symbolElement = (
    <svg
      width={symbolSize}
      height={symbolSize}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200"
      aria-label="ACCURA Logo Mark"
    >
      {/* Background Rounded Shield / Tile */}
      <rect width="40" height="40" rx="10" fill="#121316" />
      
      {/* Dynamic Grid Precision Sub-layer */}
      <path
        d="M20 7L31 29H24.5L20 18.5L15.5 29H9L20 7Z"
        fill="url(#accura_grad_1)"
      />
      
      {/* Floating Precision Node */}
      <circle cx="20" cy="27" r="2.2" fill="#D4F442" />

      {/* Cross Precision Accent */}
      <path
        d="M15 23.5H25"
        stroke="#D4F442"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <defs>
        <linearGradient
          id="accura_grad_1"
          x1="20"
          y1="7"
          x2="20"
          y2="29"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" />
          <stop offset="0.75" stopColor="#E2E8F0" />
          <stop offset="1" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (variant === 'symbol') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{symbolElement}</div>;
  }

  const textColor =
    theme === 'light'
      ? 'text-white'
      : theme === 'dark'
      ? 'text-stone-900'
      : 'text-stone-900 dark:text-stone-100';

  const subTextColor =
    theme === 'light'
      ? 'text-stone-400'
      : theme === 'dark'
      ? 'text-stone-500'
      : 'text-stone-500';

  if (variant === 'wordmark') {
    return (
      <div className={`flex flex-col ${className}`}>
        <span className={`font-black tracking-tight uppercase ${textClass} ${textColor} leading-none font-sans`}>
          ACCURA
        </span>
        {showSubtitle && (
          <span className={`font-bold tracking-wider uppercase ${subClass} ${subTextColor} mt-1`}>
            {subtitleText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {symbolElement}
      <div className="flex flex-col justify-center">
        <span className={`font-black tracking-tight uppercase ${textClass} ${textColor} leading-none font-sans`}>
          ACCURA
        </span>
        {showSubtitle && (
          <span className={`font-bold tracking-wider uppercase ${subClass} ${subTextColor} mt-1`}>
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
};
