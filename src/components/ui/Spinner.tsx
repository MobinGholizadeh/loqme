'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'white' | 'neutral';
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  color = 'primary',
}) => {
  const sizePixels = size === 'sm' ? 16 : size === 'lg' ? 28 : 20;

  const colorStyles: Record<string, string> = {
    primary: 'text-loqme-primary-500',
    white: 'text-white',
    neutral: 'text-loqme-neutral-500',
  };

  return (
    <svg
      className={cn('loqme-spinner animate-spin', colorStyles[color], className)}
      width={sizePixels}
      height={sizePixels}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="در حال بارگذاری"
      style={{
        animationDuration: '650ms', // Snappy spin per design engineering rules
      }}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 650ms linear infinite;
        }
      `}</style>
    </svg>
  );
};
