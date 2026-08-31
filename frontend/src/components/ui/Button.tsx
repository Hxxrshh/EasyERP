import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'lime';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'min-h-[32px] px-3 py-1.5 text-xs',
    md: 'min-h-[38px] px-4 py-2 text-xs',
    lg: 'min-h-[44px] px-5 py-2.5 text-sm',
  };

  const baseClasses =
    'inline-flex items-center justify-center space-x-2 font-bold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] select-none';

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-[#D4F442] hover:bg-[#C5E72D] text-[#121316] border border-[#B8D836] shadow-xs focus:ring-[#D4F442]',
    lime: 'bg-[#D4F442] hover:bg-[#C5E72D] text-[#121316] border border-[#B8D836] shadow-xs focus:ring-[#D4F442]',
    secondary: 'bg-[#18191E] hover:bg-[#272830] text-[#FAF9F5] border border-[#18191E] shadow-xs focus:ring-[#18191E]',
    success: 'bg-[#1E5E41] hover:bg-[#164731] text-white border border-[#1E5E41] shadow-xs focus:ring-[#1E5E41]',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-xs focus:ring-rose-500',
    ghost: 'bg-stone-900/[0.04] hover:bg-stone-900/[0.08] text-stone-800 border border-stone-900/[0.08] focus:ring-stone-400',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
