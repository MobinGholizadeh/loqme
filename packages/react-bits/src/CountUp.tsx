'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  separator?: string;
  decimals?: number;
  onEnd?: () => void;
}

export function CountUp({
  to,
  from = 0,
  duration = 2,
  delay = 0,
  className = '',
  prefix = '',
  suffix = '',
  separator = '،',
  decimals = 0,
  onEnd
}: CountUpProps) {
  const [value, setValue] = useState(from);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to);
      onEnd?.();
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const timeoutId = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = from + (to - from) * ease;
        setValue(current);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          setValue(to);
          onEnd?.();
        }
      };
      animationFrameId = requestAnimationFrame(step);
    }, delay * 1000);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [from, to, duration, delay, onEnd]);

  const formatted = React.useMemo(() => {
    const fixed = value.toFixed(decimals);
    const [integerPart, decimalPart] = fixed.split('.');
    const withSeparator = separator
      ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
      : integerPart;
    return `${prefix}${withSeparator}${decimalPart ? `.${decimalPart}` : ''}${suffix}`;
  }, [value, decimals, separator, prefix, suffix]);

  return (
    <span ref={elementRef} className={`tabular-nums ${className}`}>
      {formatted}
    </span>
  );
}

export default CountUp;
