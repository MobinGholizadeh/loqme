'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '🌾',
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'empty-state-container py-12 px-6 text-center space-y-4 bg-white rounded-3xl border border-dashed border-loqme-neutral-300 max-w-lg mx-auto shadow-xs',
        className
      )}
    >
      <div className="text-4xl select-none mx-auto w-16 h-16 rounded-2xl bg-loqme-neutral-50 flex items-center justify-center">
        {icon}
      </div>

      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="font-bold text-base text-loqme-neutral-900 leading-snug">{title}</h3>
        {description && (
          <p className="text-xs text-loqme-neutral-500 leading-relaxed">{description}</p>
        )}
      </div>

      {action && <div className="pt-2 flex items-center justify-center gap-2">{action}</div>}
    </div>
  );
};
