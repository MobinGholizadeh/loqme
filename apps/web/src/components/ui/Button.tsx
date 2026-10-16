"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "./Spinner";
import { RippleButton } from "@/components/magicui/ripple-button";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    "primary" | "secondary" | "ghost" | "destructive" | "accent" | "outline";
  size?: "sm" | "md" | "lg";
  rounded?: "default" | "pill";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      rounded = "pill",
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = "button",
      ...props
    },
    ref,
  ) => {
    // Size variants
    const sizeStyles = {
      sm: "min-h-[44px] px-3 text-xs gap-1.5",
      md: "min-h-[44px] px-5 text-sm gap-2",
      lg: "min-h-[52px] px-6 text-base gap-2.5",
    };

    // Rounded styles
    const roundedStyles = {
      default: "rounded-lg",
      pill: "rounded-full",
    };

    // Semantic variants
    const variantStyles = {
      primary:
        "bg-loqme-primary-600 hover:bg-loqme-primary-700 text-white border border-transparent shadow-sm hover:shadow-md font-bold",
      secondary:
        "bg-loqme-neutral-100 hover:bg-stone-200 text-loqme-neutral-900 border border-loqme-neutral-200 font-bold",
      accent:
        "bg-loqme-accent-500 hover:bg-loqme-primary-700 text-loqme-primary-600 border border-transparent shadow-sm hover:shadow-md font-black",
      outline:
        "bg-white hover:bg-teal-50 text-loqme-primary-600 border-2 border-loqme-primary-600 font-bold",
      ghost:
        "bg-transparent hover:bg-stone-100 text-loqme-neutral-700 border border-transparent font-medium",
      destructive:
        "bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-sm font-bold",
    };

    return (
      <RippleButton
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        data-variant={variant}
        className={cn(
          "loqme-button inline-flex items-center justify-center select-none cursor-pointer transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-teal-600",
          sizeStyles[size],
          roundedStyles[rounded],
          variantStyles[variant],
          (disabled || isLoading) &&
            "opacity-60 cursor-not-allowed pointer-events-none active:scale-100",
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Spinner
            size={size === "lg" ? "md" : "sm"}
            color={
              variant === "primary" || variant === "destructive"
                ? "white"
                : "primary"
            }
          />
        ) : (
          rightIcon && <span className="shrink-0">{rightIcon}</span>
        )}

        <span className={cn("min-w-0", isLoading && "opacity-70")}>
          {children}
        </span>

        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
      </RippleButton>
    );
  },
);

Button.displayName = "Button";
