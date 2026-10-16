import Link from "next/link";
import { MapPin, ArrowUpLeft } from "lucide-react";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";
import { HowItWorksButton } from "@/components/how-it-works/HowItWorksButton";

export function MarketFooter({ portal }: { portal: { href: string; label: string } | null }) {
  return <footer className="market-footer">
    <div className="footer-content">
      <div className="footer-intro">
        <Link href="/" className="footer-brand" aria-label="لقمه، صفحه اصلی">
          <LoqmeLogo theme="white" variant="icon" size={44} />
          <strong>کشف تازه، خرید هوشمندانه.</strong>
        </Link>
        <p>خوراکی‌های خوبِ نزدیک شما، با قیمتی بهتر.<br />رزرو آنلاین، دریافت حضوری از فروشگاه محله.</p>
        <span className="footer-location"><MapPin size={15} aria-hidden="true" />شروع از ارومیه</span>
      </div>
      <nav aria-label="پیوندهای پایین صفحه" className="footer-navigation">
        <h2>با لقمه کشف کن</h2>
        <Link href="/explore">کشف بسته‌ها</Link>
        <Link href="/orders">سفارش‌های من</Link>
        <Link href="/about">درباره ما</Link>
        <HowItWorksButton />
      </nav>
      <div className="footer-business">
        <span className="footer-eyebrow">برای کسب‌وکارهای محله</span>
        <h2>خوراکی‌های خوب شما،<br />کشف بعدی محله.</h2>
        <Link href={portal?.href || "/business"} className="footer-business-link">
          {portal?.label || "همراهی کسب‌وکارها"}<ArrowUpLeft size={18} aria-hidden="true" />
        </Link>
      </div>
    </div>
    <div className="footer-bottom">
      <span>تمام حقوق برای لقمه محفوظ است.</span>
      <span lang="en" dir="ltr">loqme.shop</span>
    </div>
  </footer>;
}
