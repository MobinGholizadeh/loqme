"use client";

import React from "react";
import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <PackageSearch size={30} strokeWidth={1.5} aria-hidden="true" />,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "empty-state-container py-12 px-6 text-center space-y-4 max-w-lg mx-auto",
        className,
      )}
    >
      <div className="text-4xl select-none mx-auto w-16 h-16 rounded-lg bg-loqme-neutral-50 flex items-center justify-center">
        {icon}
      </div>

      <div className="space-y-1.5 max-w-sm mx-auto">
        <h2 className="font-bold text-base text-loqme-neutral-900 leading-snug">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-loqme-neutral-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="pt-2 flex items-center justify-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
};
