import Link from "next/link";
import { MapPin, Compass, ShoppingBag, Store, ArrowLeft } from "lucide-react";
import { MagicCard } from "@/components/magicui/magic-card";

export function DiscoveryHero() {
  return <section className="deck-hero" aria-labelledby="discovery-title">
    <div className="deck-hero-copy">
      <span className="deck-eyebrow"><MapPin size={16} aria-hidden="true" />از محله‌های ارومیه شروع کن</span>
      <h1 id="discovery-title">کشف تازه‌ی امروز،<span>لقمه‌ی خوش‌قیمت تو.</span></h1>
      <p>خوراکی‌های تازه‌ی نانوایی‌ها، کافه‌ها و فروشگاه‌های نزدیک را با قیمت کمتر پیدا کن؛ آنلاین رزرو کن و حضوری تحویل بگیر.</p>
      <div className="deck-hero-actions">
        <Link href="#discover-listings" className="action-link">کشف بسته‌ها <ArrowLeft size={18} aria-hidden="true" /></Link>
        <Link href="/explore?view=map" className="action-link secondary">روی نقشه ببین</Link>
      </div>
    </div>
    <div className="deck-hero-steps" aria-label="خرید در سه قدم">
      <MagicCard className="deck-hero-step"><Compass size={24} aria-hidden="true" /><div><strong>۱. کشف کن</strong><span>بسته‌های تازه‌ی اطرافت</span></div></MagicCard>
      <MagicCard className="deck-hero-step"><ShoppingBag size={24} aria-hidden="true" /><div><strong>۲. رزرو کن</strong><span>قیمت و زمان دریافت مشخص</span></div></MagicCard>
      <MagicCard className="deck-hero-step"><Store size={24} aria-hidden="true" /><div><strong>۳. تحویل بگیر</strong><span>حضوری از فروشگاه محله</span></div></MagicCard>
    </div>
  </section>;
}
