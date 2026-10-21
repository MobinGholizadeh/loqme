'use client';

import React, { useEffect, useRef } from 'react';

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  intensity?: number;
  spotlightSize?: number;
  softness?: number;
  borderGlow?: number;
}

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(29, 97, 106, 0.15)',
  intensity = 1,
  spotlightSize = 320,
  softness = 0.8,
  borderGlow = 0.6,
  style,
  ...rest
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const borderRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const light = lightRef.current;
    const border = borderRef.current;
    if (!card || !light || !border) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const radialBg = `radial-gradient(circle ${spotlightSize}px at ${x}px ${y}px, ${spotlightColor}, transparent ${softness * 100}%)`;
      light.style.background = radialBg;
      light.style.opacity = String(intensity);

      border.style.background = `radial-gradient(circle ${spotlightSize * 0.75}px at ${x}px ${y}px, ${spotlightColor}, transparent 80%)`;
      border.style.opacity = String(borderGlow);
    };

    const onPointerLeave = () => {
      light.style.opacity = '0';
      border.style.opacity = '0';
    };

    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerleave', onPointerLeave);

    return () => {
      card.removeEventListener('pointermove', onPointerMove);
      card.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [spotlightColor, intensity, spotlightSize, softness, borderGlow]);

  return (
    <div
      ref={cardRef}
      className={`relative isolate overflow-hidden rounded-2xl bg-white border border-[#CDDCD6] p-6 transition-shadow duration-300 hover:shadow-lg ${className}`}
      style={style}
      {...rest}
    >
      <span
        ref={lightRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300"
      />
      <span
        ref={borderRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] p-px opacity-0 transition-opacity duration-300"
      />
      {children}
    </div>
  );
}

export default SpotlightCard;
