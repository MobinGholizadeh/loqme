"use client";

import { createContext, useContext, useRef, type HTMLAttributes } from "react";
import { motion, useScroll, useTransform, type HTMLMotionProps, type MotionValue } from "framer-motion";

// Adapted from the owner's supplied animated-cards-stack component.
// Uses the existing Motion dependency and Loqme styles instead of demo theme/avatar dependencies.
const ScrollContext = createContext<MotionValue<number> | null>(null);

export function ContainerScroll({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return <ScrollContext.Provider value={scrollYProgress}>
    <div ref={ref} className={`cards-scroll ${className}`} {...props}>{children}</div>
  </ScrollContext.Provider>;
}

export function CardsContainer({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`cards-stack ${className}`} {...props} />;
}

interface CardTransformedProps extends HTMLMotionProps<"article"> {
  index: number;
  arrayLength: number;
}

export function CardTransformed({ index, arrayLength, className = "", style, ...props }: CardTransformedProps) {
  const progress = useContext(ScrollContext);
  if (!progress) throw new Error("CardTransformed must be inside ContainerScroll");
  return <AnimatedCard progress={progress} index={index} arrayLength={arrayLength} className={className} style={style} {...props} />;
}

function AnimatedCard({ progress, index, arrayLength, className, style, ...props }: CardTransformedProps & { progress: MotionValue<number> }) {
  // Keep the transforms on Motion's JS path so native scroll timelines do not
  // reinterpret the staggered ranges relative to the whole document.
  const localProgress = useTransform(() => progress.get());
  const start = 0.18 + index * 0.38;
  const end = Math.min(0.98, start + 0.2);
  const last = index === arrayLength - 1;
  const y = useTransform(localProgress, [start, end], ["0%", last ? "0%" : "-145%"]);
  const rotate = useTransform(localProgress, [Math.max(0, start - 0.3), start, end], [index % 2 ? -7 : 6, 0, last ? 0 : -12]);
  const opacity = useTransform(localProgress, [end - 0.08, end], [1, last ? 1 : 0]);
  return <motion.article className={`stack-card ${className}`} style={{
    top: index * 12, zIndex: arrayLength - index, y, rotate, opacity, ...style,
  }} {...props} />;
}
