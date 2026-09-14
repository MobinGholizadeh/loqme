"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  icon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      icon,
      children,
      className,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="select-container w-full">
        {label && (
          <label htmlFor={selectId} className="select-label">
            {label}
          </label>
        )}

        <div
          className={cn(
            "select-wrapper",
            error && "select-has-error",
            disabled && "select-disabled",
          )}
        >
          {icon && <div className="select-icon-prefix">{icon}</div>}

          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? `${selectId}-message` : undefined}
            className={cn("select-field", className)}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Custom Chevron for RTL (placed on the left in RTL layout) */}
          <div className="select-chevron pointer-events-none">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-loqme-neutral-500"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {error && (
          <p
            id={`${selectId}-message`}
            className="select-error-msg"
            role="alert"
          >
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${selectId}-message`} className="select-hint-msg">
            {hint}
          </p>
        )}

        <style jsx>{`
          .select-container {
            display: flex;
            flex-direction: column;
            gap: var(--space-1);
            width: 100%;
          }

          .select-label {
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-medium);
            color: var(--color-text-secondary);
            margin-bottom: 2px;
          }

          .select-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            background-color: var(--color-bg-surface);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-md);
            transition:
              border-color 150ms var(--ease-out),
              box-shadow 150ms var(--ease-out);
            min-height: 44px;
          }

          .select-wrapper:focus-within {
            border-color: var(--loqme-primary-600);
            box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15);
          }

          .select-has-error {
            border-color: var(--loqme-danger-500) !important;
          }

          .select-has-error:focus-within {
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
          }

          .select-disabled {
            background-color: var(--color-bg-muted);
            opacity: 0.6;
            cursor: not-allowed;
          }

          .select-field {
            flex: 1;
            width: 100%;
            height: 100%;
            padding-block: var(--space-2);
            padding-inline: var(--space-3) var(--space-8);
            border: none;
            background: transparent;
            color: var(--color-text-primary);
            font-size: var(--font-size-sm);
            font-family: inherit;
            font-weight: var(--font-weight-medium);
            outline: none;
            direction: inherit;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            cursor: pointer;
          }

          .select-icon-prefix {
            display: flex;
            align-items: center;
            padding-inline-start: var(--space-3);
            color: var(--color-text-muted);
            font-size: var(--font-size-sm);
            user-select: none;
          }

          .select-chevron {
            position: absolute;
            inset-inline-end: var(--space-3);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .select-error-msg {
            font-size: var(--font-size-xs);
            color: var(--loqme-danger-600);
            margin-top: 2px;
          }

          .select-hint-msg {
            font-size: var(--font-size-xs);
            color: var(--color-text-muted);
            margin-top: 2px;
          }
        `}</style>
      </div>
    );
  },
);

Select.displayName = "Select";
