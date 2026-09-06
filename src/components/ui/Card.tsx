'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'flat';
  isInteractive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'elevated',
  isInteractive = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'loqme-card',
        `card-${variant}`,
        isInteractive && 'card-interactive',
        className
      )}
      {...props}
    >
      {children}

      <style jsx>{`
        .loqme-card {
          background-color: var(--color-bg-surface);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          position: relative;
          transition: transform 180ms var(--ease-out),
            box-shadow 180ms var(--ease-out),
            border-color 180ms var(--ease-out);
        }

        .card-elevated {
          box-shadow: var(--shadow-card);
          border: 1px solid var(--color-border-subtle);
        }

        .card-outlined {
          border: 1px solid var(--color-border-strong);
          box-shadow: none;
        }

        .card-flat {
          background-color: var(--color-bg-muted);
          border: none;
          box-shadow: none;
        }

        @media (hover: hover) and (pointer: fine) {
          .card-interactive:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
            border-color: var(--loqme-primary-200);
            cursor: pointer;
          }
        }

        .card-interactive:active {
          transform: scale(0.99);
        }
      `}</style>
    </div>
  );
};
