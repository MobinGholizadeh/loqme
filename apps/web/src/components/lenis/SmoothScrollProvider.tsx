'use client';

import React, { useEffect, useState } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'lenis/dist/lenis.css';

export interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

function ScrollTriggerConnector() {
  useLenis(() => {
    ScrollTrigger.update();
  });
  return null;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined') {
      if (typeof window.matchMedia === 'function') {
        gsap.registerPlugin(ScrollTrigger);
      }
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        syncTouch: false,
        autoRaf: true,
      }}
    >
      <ScrollTriggerConnector />
      {children}
    </ReactLenis>
  );
}

export default SmoothScrollProvider;
