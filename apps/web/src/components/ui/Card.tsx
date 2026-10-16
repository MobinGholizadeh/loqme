"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { MagicCard } from "@/components/magicui/magic-card";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "outlined" | "flat";
  isInteractive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = "elevated",
  isInteractive = false,
  ...props
}) => {
  const variantStyles = {
    elevated: "bg-white border border-stone-200/90 shadow-sm",
    outlined: "bg-white border border-loqme-neutral-300 shadow-none",
    flat: "bg-loqme-neutral-50 border-0 shadow-none",
  };

  return (
    <MagicCard
      className={cn(
        "loqme-card rounded-lg p-5 relative transition-colors duration-200",
        variantStyles[variant],
        isInteractive && "hover:shadow-md hover:border-teal-300 cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </MagicCard>
  );
};
