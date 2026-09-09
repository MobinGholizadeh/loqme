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
  const variantStyles = {
    elevated: 'bg-white border border-stone-200/90 shadow-sm',
    outlined: 'bg-white border border-stone-300 shadow-none',
    flat: 'bg-stone-50 border-0 shadow-none',
  };

  return (
    <div
      className={cn(
        'rounded-3xl p-6 relative transition-all duration-200',
        variantStyles[variant],
        isInteractive && 'hover:-translate-y-0.5 hover:shadow-md hover:border-teal-300 cursor-pointer active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
