"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "brand" | "success" | "warning" | "danger" | "neutral";
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = "neutral",
  size = "md",
  icon,
  ...props
}) => {
  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-[11px] gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
  };

  const variantStyles = {
    brand:
      "bg-loqme-primary-50 text-loqme-primary-600 border border-teal-200 font-bold",
    success:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold",
    warning: "bg-amber-50 text-amber-800 border border-amber-200 font-medium",
    danger: "bg-red-50 text-red-700 border border-red-200 font-medium",
    neutral:
      "bg-loqme-neutral-100 text-loqme-neutral-700 border border-loqme-neutral-200 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold select-none",
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
