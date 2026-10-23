"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import "./response-stream.css";

interface ResponseStreamProps {
  textStream: string;
  mode?: "fade";
  fadeDuration?: number;
  segmentDelay?: number;
  className?: string;
}

/** Static-copy fade variant of the owner's ResponseStream, started in view.
 * Full text reserves space and remains available to assistive technology/SSR.
 * Whitespace segmentation preserves Persian joining, diacritics and ZWNJ.
 */
export function ResponseStream({ textStream, fadeDuration = 550, segmentDelay = 35, className = "" }: ResponseStreamProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let revealed = false;
    const configure = () => {
      observer?.disconnect();
      if (preference.matches) {
        element.dataset.motion = "static";
        return;
      }
      if (revealed) return;
      element.dataset.motion = "waiting";
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          element.dataset.motion = "playing";
          revealed = true;
          observer?.disconnect();
        }
      }, { threshold: 0.2 });
      observer.observe(element);
    };
    configure();
    preference.addEventListener("change", configure);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", configure);
    };
  }, [textStream]);

  let wordIndex = 0;
  const words = textStream.split(/(\s+)/);
  const delay = Math.min(Math.max(0, segmentDelay), 1800 / Math.max(1, words.length));
  return <span ref={ref} className={`response-stream ${className}`}>
    <span className="response-stream-readable">{textStream}</span>
    <span aria-hidden="true">{words.map((word, index) => /^\s+$/.test(word) ? word :
      <span key={index} className="response-stream-word" style={{
        "--word-delay": `${wordIndex++ * delay}ms`,
        "--word-duration": `${Math.max(0, fadeDuration)}ms`,
      } as CSSProperties}>{word}</span>)}</span>
  </span>;
}
