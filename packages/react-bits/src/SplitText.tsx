'use client';

import React, { useRef, useMemo } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitBy?: 'words' | 'chars';
  stagger?: number;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  onComplete?: () => void;
}

export function SplitText({
  text,
  className = '',
  delay = 0,
  duration = 0.8,
  ease = 'power3.out',
  splitBy = 'words',
  stagger = 0.06,
  tag = 'p',
  from = { opacity: 0, y: 24 },
  to = { opacity: 1, y: 0 },
  onComplete
}: SplitTextProps) {
  const containerRef = useRef<HTMLElement>(null);

  // Split into tokens based on splitBy mode
  const tokens = useMemo(() => {
    if (splitBy === 'words') {
      return text.split(/(\s+)/);
    }
    // Chars mode
    return Array.from(text);
  }, [text, splitBy]);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        onComplete?.();
        return;
      }

      const targets = container.querySelectorAll('.split-token');
      if (!targets.length) return;

      gsap.fromTo(
        targets,
        {
          ...from,
          willChange: 'transform, opacity'
        },
        {
          ...to,
          duration,
          delay: delay / 1000,
          stagger,
          ease,
          clearProps: 'willChange',
          onComplete
        }
      );
    },
    { scope: containerRef, dependencies: [text, delay, duration, ease, stagger] }
  );

  const Tag = tag as any;

  return (
    <Tag ref={containerRef} className={`inline-block ${className}`}>
      {tokens.map((token, index) => {
        // Preserve whitespace naturally without wrapping it in an animated box
        if (/^\s+$/.test(token)) {
          return <span key={index}>{token}</span>;
        }

        return (
          <span
            key={index}
            className="split-token inline-block"
            style={{ display: 'inline-block' }}
          >
            {token}
          </span>
        );
      })}
    </Tag>
  );
}

export default SplitText;
