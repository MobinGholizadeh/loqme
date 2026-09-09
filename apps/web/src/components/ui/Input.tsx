'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixElement?: React.ReactNode;
  suffixElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      prefixElement,
      suffixElement,
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full text-right">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-stone-700">
            {label}
          </label>
        )}

        <div
          className={cn(
            'flex items-center bg-white border border-stone-300 rounded-full px-4 min-h-[46px] transition-all overflow-hidden focus-within:border-[#135E66] focus-within:ring-2 focus-within:ring-teal-500/20 shadow-xs',
            error && 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20',
            disabled && 'bg-stone-100 opacity-60 cursor-not-allowed'
          )}
        >
          {prefixElement && (
            <div className="flex items-center text-stone-400 text-xs select-none pl-3 border-l border-stone-200 ml-2 shrink-0">
              {prefixElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'flex-1 w-full bg-transparent border-none outline-none text-stone-900 text-sm font-medium placeholder:text-stone-400 py-2.5',
              className
            )}
            {...props}
          />

          {suffixElement && (
            <div className="flex items-center text-stone-400 text-xs select-none pr-2 shrink-0">
              {suffixElement}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </p>
        )}

        {!error && hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
