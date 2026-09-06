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
      <div className="input-container w-full">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}

        <div className={cn('input-wrapper', error && 'input-has-error', disabled && 'input-disabled')}>
          {prefixElement && <div className="input-prefix">{prefixElement}</div>}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn('input-field', className)}
            {...props}
          />

          {suffixElement && <div className="input-suffix">{suffixElement}</div>}
        </div>

        {error && (
          <p className="input-error-msg" role="alert">
            {error}
          </p>
        )}

        {!error && hint && <p className="input-hint-msg">{hint}</p>}

        <style jsx>{`
          .input-container {
            display: flex;
            flex-direction: column;
            gap: var(--space-1);
            width: 100%;
          }

          .input-label {
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-medium);
            color: var(--color-text-secondary);
            margin-bottom: var(--space-1);
          }

          .input-wrapper {
            display: flex;
            align-items: center;
            background-color: var(--color-bg-surface);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-md);
            transition: border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out);
            overflow: hidden;
            min-height: 44px;
          }

          .input-wrapper:focus-within {
            border-color: var(--loqme-primary-500);
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
          }

          .input-has-error {
            border-color: var(--loqme-danger-500) !important;
          }

          .input-has-error:focus-within {
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
          }

          .input-disabled {
            background-color: var(--color-bg-muted);
            opacity: 0.6;
            cursor: not-allowed;
          }

          .input-field {
            flex: 1;
            width: 100%;
            height: 100%;
            padding: var(--space-2) var(--space-3);
            border: none;
            background: transparent;
            color: var(--color-text-primary);
            font-size: var(--font-size-base);
            font-family: inherit;
            outline: none;
            direction: inherit;
          }

          .input-field::placeholder {
            color: var(--color-text-muted);
          }

          .input-prefix,
          .input-suffix {
            display: flex;
            align-items: center;
            padding: 0 var(--space-3);
            color: var(--color-text-muted);
            font-size: var(--font-size-sm);
            user-select: none;
          }

          .input-error-msg {
            font-size: var(--font-size-xs);
            color: var(--loqme-danger-600);
            margin-top: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .input-hint-msg {
            font-size: var(--font-size-xs);
            color: var(--color-text-muted);
            margin-top: 2px;
          }
        `}</style>
      </div>
    );
  }
);

Input.displayName = 'Input';
