"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular" | "rounded";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rounded",
  width,
  height,
  style,
  ...props
}) => {
  const variantStyles = {
    rectangular: "rounded-none",
    circular: "rounded-full",
    rounded: "rounded-lg",
  };

  return (
    <div
      className={cn("animate-shimmer", variantStyles[variant], className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border border-loqme-neutral-200 p-4 space-y-3 shadow-card">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1">
          <Skeleton height={18} width="55%" />
          <Skeleton height={14} width="35%" />
        </div>
        <Skeleton height={22} width={80} variant="rounded" />
      </div>

      <Skeleton height={18} width="85%" className="my-2" />
      <Skeleton height={14} width="95%" />

      <Skeleton height={34} width="100%" className="my-2" />

      <div className="pt-3 border-t border-loqme-neutral-100 flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton height={12} width={70} />
          <Skeleton height={22} width={110} />
        </div>
        <Skeleton height={36} width={100} />
      </div>
    </div>
  );
};
