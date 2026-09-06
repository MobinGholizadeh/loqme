'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'brand',
  size = 'md',
  icon,
  ...props
}) => {
  return (
    <span
      className={cn(
        'loqme-badge',
        `badge-${variant}`,
        `badge-${size}`,
        className
      )}
      {...props}
    >
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-text">{children}</span>

      <style jsx>{`
        .loqme-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
          font-family: var(--font-family-base);
          font-weight: var(--font-weight-medium);
          border-radius: var(--radius-full);
          width: fit-content;
          white-space: nowrap;
          user-select: none;
        }

        .badge-sm {
          font-size: var(--font-size-xs);
          padding: 2px 8px;
        }

        .badge-md {
          font-size: var(--font-size-sm);
          padding: 4px 12px;
        }

        .badge-brand {
          background-color: var(--loqme-primary-50);
          color: var(--loqme-primary-700);
          border: 1px solid var(--loqme-primary-200);
        }

        .badge-success {
          background-color: var(--loqme-success-50);
          color: var(--loqme-success-700);
          border: 1px solid var(--loqme-success-100);
        }

        .badge-warning {
          background-color: var(--loqme-warning-50);
          color: var(--loqme-warning-600);
          border: 1px solid var(--loqme-warning-100);
        }

        .badge-danger {
          background-color: var(--loqme-danger-50);
          color: var(--loqme-danger-600);
          border: 1px solid var(--loqme-danger-100);
        }

        .badge-neutral {
          background-color: var(--loqme-neutral-100);
          color: var(--loqme-neutral-700);
          border: 1px solid var(--loqme-neutral-200);
        }

        .badge-icon {
          display: inline-flex;
          align-items: center;
        }
      `}</style>
    </span>
  );
};
