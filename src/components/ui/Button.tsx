'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
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
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyle =
      'inline-flex items-center justify-center font-medium select-none cursor-pointer border rounded-lg transition-transform focus-visible:outline-none';

    // Size variants
    const sizeStyles = {
      sm: 'h-9 px-3 text-xs gap-1.5 min-h-[36px]',
      md: 'h-11 px-4 text-sm gap-2 min-h-[44px]',
      lg: 'h-13 px-6 text-base gap-2.5 min-h-[52px]',
    };

    // Semantic variants
    const variantStyles = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      destructive: 'btn-destructive',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyle,
          sizeStyles[size],
          variantStyles[variant],
          (disabled || isLoading) && 'opacity-60 cursor-not-allowed pointer-events-none',
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
          rightIcon && <span className="btn-icon-right">{rightIcon}</span>
        )}

        <span className={cn('btn-content', isLoading && 'opacity-70')}>{children}</span>

        {!isLoading && leftIcon && <span className="btn-icon-left">{leftIcon}</span>}

        <style jsx>{`
          button {
            border-radius: var(--radius-md);
            font-family: var(--font-family-base);
            transition: transform var(--duration-press) var(--ease-out),
              background-color 160ms ease,
              border-color 160ms ease,
              box-shadow 160ms ease;
          }

          /* Press feedback following Emil Kowalski guidelines */
          button:active:not(:disabled) {
            transform: scale(0.97);
          }

          .btn-primary {
            background-color: var(--loqme-primary-600);
            color: #ffffff;
            border-color: var(--loqme-primary-700);
            box-shadow: var(--shadow-sm);
          }

          @media (hover: hover) and (pointer: fine) {
            .btn-primary:hover:not(:disabled) {
              background-color: var(--loqme-primary-700);
              border-color: var(--loqme-primary-800);
              box-shadow: var(--shadow-md);
            }
          }

          .btn-secondary {
            background-color: var(--loqme-primary-50);
            color: var(--loqme-primary-700);
            border-color: var(--loqme-primary-200);
          }

          @media (hover: hover) and (pointer: fine) {
            .btn-secondary:hover:not(:disabled) {
              background-color: var(--loqme-primary-100);
              border-color: var(--loqme-primary-300);
            }
          }

          .btn-ghost {
            background-color: transparent;
            color: var(--color-text-primary);
            border-color: transparent;
          }

          @media (hover: hover) and (pointer: fine) {
            .btn-ghost:hover:not(:disabled) {
              background-color: var(--loqme-neutral-100);
            }
          }

          .btn-destructive {
            background-color: var(--loqme-danger-500);
            color: #ffffff;
            border-color: var(--loqme-danger-600);
          }

          @media (hover: hover) and (pointer: fine) {
            .btn-destructive:hover:not(:disabled) {
              background-color: var(--loqme-danger-600);
            }
          }
        `}</style>
      </button>
    );
  }
);

Button.displayName = 'Button';
