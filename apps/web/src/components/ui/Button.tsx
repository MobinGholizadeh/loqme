'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'default' | 'pill';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      rounded = 'pill',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Size variants
    const sizeStyles = {
      sm: 'h-9 px-4 text-xs gap-1.5 min-h-[36px]',
      md: 'h-11 px-6 text-sm gap-2 min-h-[44px]',
      lg: 'h-13 px-8 text-base gap-2.5 min-h-[52px]',
    };

    // Rounded styles
    const roundedStyles = {
      default: 'rounded-2xl',
      pill: 'rounded-full',
    };

    // Semantic variants
    const variantStyles = {
      primary: 'bg-[#135E66] hover:bg-[#0F4E55] text-white border border-transparent shadow-sm hover:shadow-md font-bold',
      secondary: 'bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200 font-bold',
      accent: 'bg-[#65CF9B] hover:bg-[#5FE0A4] text-[#135E66] border border-transparent shadow-sm hover:shadow-md font-black',
      outline: 'bg-white hover:bg-teal-50 text-[#135E66] border-2 border-[#135E66] font-bold',
      ghost: 'bg-transparent hover:bg-stone-100 text-stone-700 border border-transparent font-medium',
      destructive: 'bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-sm font-bold',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center select-none cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 active:scale-[0.97]',
          sizeStyles[size],
          roundedStyles[rounded],
          variantStyles[variant],
          (disabled || isLoading) && 'opacity-60 cursor-not-allowed pointer-events-none active:scale-100',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Spinner
            size={size === 'lg' ? 'md' : 'sm'}
            color={variant === 'primary' || variant === 'destructive' ? 'white' : 'primary'}
          />
        ) : (
          rightIcon && <span className="shrink-0">{rightIcon}</span>
        )}

        <span className={cn('truncate', isLoading && 'opacity-70')}>{children}</span>

        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
