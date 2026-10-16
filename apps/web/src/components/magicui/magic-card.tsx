"use client";

// Gradient mode adapted from Magic UI magic-card (MIT, see ./LICENSE).
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function MagicCard({ children, className, onPointerMove, onPointerLeave, ...props }: HTMLAttributes<HTMLDivElement>) {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const reduced = useReducedMotion();
  const background = useMotionTemplate`radial-gradient(280px circle at ${x}px ${y}px, var(--deck-glow), transparent 100%)`;
  return <div {...props} className={cn("magic-card", className)} onPointerMove={event => {
    onPointerMove?.(event);
    if (reduced || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - bounds.left); y.set(event.clientY - bounds.top);
  }} onPointerLeave={event => { onPointerLeave?.(event); x.set(-400); y.set(-400); }}>
    <motion.div aria-hidden="true" className="magic-card-light" style={{ background }} />
    {children}
  </div>;
}
