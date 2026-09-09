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
  variant = 'neutral',
  size = 'md',
  icon,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
  };

  const variantStyles = {
    brand: 'bg-[#F0FDFA] text-[#135E66] border border-teal-200 font-bold',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 font-medium',
    danger: 'bg-red-50 text-red-700 border border-red-200 font-medium',
    neutral: 'bg-stone-100 text-stone-700 border border-stone-200 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold select-none',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
