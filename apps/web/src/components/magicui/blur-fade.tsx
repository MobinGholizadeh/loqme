"use client";

// Adapted from Magic UI blur-fade (MIT, see ./LICENSE).
// Content stays visible during SSR; entrance motion is progressive enhancement.
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function BlurFade({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={false}
    animate={reduced ? { opacity: 1, y: 0, filter: "none" } : { opacity: [0.7, 1], y: [6, 0], filter: ["blur(2px)", "blur(0px)"], transitionEnd: { filter: "none", transform: "none" } }}
    transition={{ duration: reduced ? 0 : 0.28, ease: "easeOut" }}>
    {children}
  </motion.div>;
}
