'use client';

import React from 'react';

export interface ShinyTextProps {
  text?: string;
  children?: React.ReactNode;
  color?: string;
  shineColor?: string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function ShinyText({
  text,
  children,
  color = '#1D616A',
  shineColor = '#5eead4',
  speed = 3,
  className = '',
  style
}: ShinyTextProps) {
  const content = children ?? text;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium relative overflow-hidden bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(110deg, ${color} 35%, ${shineColor} 50%, ${color} 65%)`,
        backgroundSize: '200% 100%',
        animation: `shiny-sweep ${speed}s ease-in-out infinite`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        ...style
      }}
    >
      <style>{`
        @keyframes shiny-sweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          span { animation: none !important; }
        }
      `}</style>
      {content}
    </span>
  );
}

export default ShinyText;
