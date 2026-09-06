'use client';

import React from 'react';
import { Button } from './Button';
import { cn } from '@/lib/utils/cn';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'خطایی در ارتباط با سرور رخ داد',
  message = 'امکان دریافت اطلاعات وجود ندارد. لطفاً ارتباط اینترنت خود را بررسی نموده و مجدداً تلاش کنید.',
  onRetry,
  retryText = 'تلاش مجدد',
  secondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'error-state-container p-6 bg-rose-50/60 border border-rose-200 text-rose-900 rounded-3xl text-center space-y-3 max-w-lg mx-auto shadow-xs',
        className
      )}
    >
      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">
        ⚠️
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-rose-950">{title}</h3>
        {message && <p className="text-xs text-rose-700/90 leading-relaxed">{message}</p>}
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        {onRetry && (
          <Button size="sm" variant="primary" onClick={onRetry} className="bg-rose-600 hover:bg-rose-700 border-rose-700">
            {retryText}
          </Button>
        )}
        {secondaryAction}
      </div>
    </div>
  );
};
