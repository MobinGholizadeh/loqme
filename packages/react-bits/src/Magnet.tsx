'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface MagnetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: number;
  disabled?: boolean;
  magnetStrength?: number;
  activeClassName?: string;
  innerClassName?: string;
}

export function Magnet({
  children,
  padding = 60,
  disabled = false,
  magnetStrength = 2.5,
  className = '',
  activeClassName = '',
  innerClassName = '',
  style,
  ...props
}: MagnetProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner || disabled) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let isHovering = false;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;

      const rect = wrapper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;
      const distance = Math.hypot(distX, distY);

      const maxDistance = Math.max(rect.width, rect.height) / 2 + padding;

      if (distance < maxDistance) {
        if (!isHovering) {
          isHovering = true;
          setIsActive(true);
        }
        const pull = 1 - distance / maxDistance;
        const moveX = (distX / magnetStrength) * pull;
        const moveY = (distY / magnetStrength) * pull;

        inner.style.transform = `translate3d(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px, 0)`;
        inner.style.transition = 'transform 0.1s ease-out';
      } else if (isHovering) {
        isHovering = false;
        setIsActive(false);
        inner.style.transform = 'translate3d(0, 0, 0)';
        inner.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2)';
      }
    };

    const handlePointerLeave = () => {
      isHovering = false;
      setIsActive(false);
      inner.style.transform = 'translate3d(0, 0, 0)';
      inner.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2)';
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    wrapper.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      wrapper.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [disabled, padding, magnetStrength]);

  return (
    <div
      ref={wrapperRef}
      className={`inline-block ${className} ${isActive ? activeClassName : ''}`}
      style={{ position: 'relative', ...style }}
      {...props}
    >
      <div ref={innerRef} className={innerClassName} style={{ willChange: 'transform' }}>
        {children}
      </div>
    </div>
  );
}

export default Magnet;
