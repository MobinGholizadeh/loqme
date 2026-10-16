"use client";

// Adapted from Magic UI's MIT-licensed ripple-button. See ./LICENSE.
// Keyboard-centered ripples, bounded cleanup and reduced motion added for Loqme.
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export const RippleButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, className, onClick, type, ...props }, ref) => {
    const sequence = useRef(0);
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);
    useEffect(() => {
      if (!ripples.length) return;
      // Also clean up when animationend is lost (background tab or changed motion preference).
      const timeout = setTimeout(() => setRipples([]), 650);
      return () => clearTimeout(timeout);
    }, [ripples]);
    return <button {...props} type={type} ref={ref} className={cn("magic-ripple-button", className)} onClick={event => {
      onClick?.(event);
      if (event.defaultPrevented || !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = (event.detail === 0 ? rect.width / 2 : event.clientX - rect.left) - size / 2;
      const y = (event.detail === 0 ? rect.height / 2 : event.clientY - rect.top) - size / 2;
      setRipples(previous => [...previous.slice(-3), { id: ++sequence.current, x, y, size }]);
    }}>
      {children}
      <span className="magic-ripple-layer" aria-hidden="true">{ripples.map(ripple => <span
        key={ripple.id} className="magic-ripple" style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
        onAnimationEnd={() => setRipples(previous => previous.filter(item => item.id !== ripple.id))}
      />)}</span>
    </button>;
  },
);
RippleButton.displayName = "RippleButton";
