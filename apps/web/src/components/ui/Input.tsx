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
            'flex items-center bg-white border border-stone-200 rounded-full px-4 min-h-[48px] transition-all focus-within:border-[#135E66] focus-within:ring-2 focus-within:ring-teal-500/20 shadow-xs gap-2',
            error && 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20',
            disabled && 'bg-stone-100 opacity-60 cursor-not-allowed'
          )}
        >
          {prefixElement && (
            <div className="flex items-center text-stone-500 text-xs select-none shrink-0 font-medium">
              {prefixElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'flex-1 w-full bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 text-stone-900 text-sm font-medium placeholder:text-stone-400 py-2.5',
              className
            )}
            {...props}
          />

          {suffixElement && (
            <div className="flex items-center text-stone-500 text-xs select-none shrink-0 font-medium">
              {suffixElement}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </p>
        )}

        {!error && hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
