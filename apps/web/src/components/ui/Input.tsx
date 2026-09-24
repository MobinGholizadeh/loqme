"use client";

import React from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

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
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5 w-full text-right">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-loqme-neutral-700"
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            "flex items-center bg-white border border-loqme-neutral-300 rounded-lg px-4 min-h-[48px] transition-colors focus-within:border-loqme-primary-600 focus-within:ring-2 focus-within:ring-teal-500/20 gap-2",
            error &&
              "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20",
            disabled && "bg-loqme-neutral-100 opacity-60 cursor-not-allowed",
          )}
        >
          {prefixElement && (
            <div className="flex items-center text-loqme-neutral-600 text-xs select-none shrink-0 font-medium">
              {prefixElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? `${inputId}-message` : undefined}
            className={cn(
              "flex-1 min-w-0 w-full bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 text-loqme-neutral-900 text-base md:text-sm font-medium placeholder:text-stone-400 py-2.5",
              className,
            )}
            {...props}
          />

          {suffixElement && (
            <div className="flex items-center text-loqme-neutral-600 text-xs select-none shrink-0 font-medium">
              {suffixElement}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-message`}
            className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1"
            role="alert"
          >
            <CircleAlert size={14} className="shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {!error && hint && (
          <p
            id={`${inputId}-message`}
            className="text-xs text-loqme-neutral-600 mt-1"
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
