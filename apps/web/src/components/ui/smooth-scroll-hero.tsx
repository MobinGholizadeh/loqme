"use client";

import Image from "next/image";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useMotionTemplate, useScroll, useTransform } from "framer-motion";

interface SmoothScrollHeroProps {
  desktopImage: string;
  mobileImage: string;
  imageAlt: string;
  children: ReactNode;
  scrollHeight?: number;
  initialClipPercentage?: number;
  finalClipPercentage?: number;
}

/** Owner-supplied image reveal, scoped to its section rather than page scroll. */
export default function SmoothScrollHero({ desktopImage, mobileImage, imageAlt, children,
  scrollHeight = 900, initialClipPercentage = 18, finalClipPercentage = 82,
}: SmoothScrollHeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const progress = useTransform(() => scrollYProgress.get());
  const clipStart = useTransform(progress, [0, 0.75], [initialClipPercentage, 0]);
  const clipEnd = useTransform(progress, [0, 0.75], [finalClipPercentage, 100]);
  const clipPath = useMotionTemplate`polygon(${clipStart}% ${clipStart}%, ${clipEnd}% ${clipStart}%, ${clipEnd}% ${clipEnd}%, ${clipStart}% ${clipEnd}%)`;
  const scale = useTransform(progress, [0, 1], [1.25, 1]);

  return <div ref={ref} className="smooth-hero" style={{ "--reveal-scroll": `${scrollHeight}px` } as CSSProperties}>
    <div className="smooth-hero-sticky">
      <motion.div className="smooth-hero-reveal" style={{ clipPath }}>
        <motion.picture className="smooth-hero-picture" style={{ scale }}>
          <source media="(max-width: 767px)" srcSet={mobileImage} />
          <Image unoptimized src={desktopImage} width={1672} height={941} alt={imageAlt} loading="lazy" decoding="async" />
        </motion.picture>
        <div className="smooth-hero-shade" />
      </motion.div>
      <div className="smooth-hero-content">{children}</div>
    </div>
  </div>;
}
