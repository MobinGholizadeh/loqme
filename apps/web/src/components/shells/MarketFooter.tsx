"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";
import { HowItWorksButton } from "@/components/how-it-works/HowItWorksButton";

export function MarketFooter({ portal }: { portal: { href: string; label: string } | null }) {
  const wordmark = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); }
    }, { threshold: 0.15 });
    if (wordmark.current) observer.observe(wordmark.current);
    return () => observer.disconnect();
  }, []);
  return <footer className="market-footer">
    <div className="market-footer-top">
      <Link href="/" className="footer-brand" aria-label="لقمه، صفحه اصلی"><LoqmeLogo variant="icon" theme="white" size={52}/><span lang="en">Loqme</span></Link>
      <div className="footer-links">
        <p>کشف خوراکی‌های تازه، خرید هوشمندانه از محله.</p>
        <nav aria-label="پیوندهای پایین صفحه">
          <Link href="/explore">کشف بسته‌ها</Link><Link href="/orders">سفارش‌های من</Link>
          {portal ? <Link href={portal.href}>{portal.label}</Link> : <Link href="/business">همراهی کسب‌وکارها</Link>}<HowItWorksButton/>
        </nav>
      </div>
    </div>
    <div className="footer-signature" ref={wordmark} data-revealed={revealed}>
      <div className="footer-wordmark" lang="en" dir="ltr">Loqme</div>
      <div className="footer-bottom"><span>تازه، محلی، به‌صرفه</span><span lang="en" dir="ltr">loqme.shop</span><span>تمام حقوق برای لقمه محفوظ است.</span></div>
    </div>
  </footer>;
}
