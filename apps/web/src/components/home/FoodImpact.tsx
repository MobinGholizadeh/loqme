import { ResponseStream } from "@/components/ui/response-stream";
import Link from "next/link";
import { ArrowLeft, Leaf, Store, Wallet } from "lucide-react";
import SmoothScrollHero from "@/components/ui/smooth-scroll-hero";

export function FoodImpact() {
  return <section className="food-impact" aria-labelledby="food-impact-title">
    <SmoothScrollHero desktopImage="/images/home/food-nature-desktop.webp" mobileImage="/images/home/food-nature-mobile.webp" imageAlt="کیسه‌ای از نان، میوه و خوراکی‌های تازه روی میز در میان فضای سبز">
      <div className="food-impact-copy">
        <span className="food-impact-kicker"><Leaf size={18} aria-hidden="true" /><ResponseStream textStream="یک انتخاب کوچک، یک اثر خوب" mode="fade" /></span>
        <h2 id="food-impact-title"><ResponseStream textStream="خوبی‌ها را بچشیم،" mode="fade" /><br /><span><ResponseStream textStream="هدر ندهیم" mode="fade" /></span></h2>
        <p className="food-impact-intro"><ResponseStream textStream="خوراکیِ خوب، ارزش خوردن دارد؛ با لقمه، موجودی سالمِ مازاد فروشگاه‌های محله فرصت پیدا می‌کند به‌جای دور ریخته شدن، به دست تو برسد" mode="fade" /></p>
        <ul className="food-impact-benefits">
          <li><Wallet aria-hidden="true" size={22} /><div><h3><ResponseStream textStream="به‌صرفه برای تو" mode="fade" /></h3><p><ResponseStream textStream="طعم‌های تازه را کشف کن و با قیمت کمتر خرید کن" mode="fade" /></p></div></li>
          <li><Store aria-hidden="true" size={22} /><div><h3><ResponseStream textStream="فرصتی برای فروشگاه محله" mode="fade" /></h3><p><ResponseStream textStream="موجودی سالمِ فروش‌نرفته، به فرصتی برای فروش تبدیل می‌شود" mode="fade" /></p></div></li>
          <li><Leaf aria-hidden="true" size={22} /><div><h3><ResponseStream textStream="هدررفت کمتر، احترام بیشتر به طبیعت" mode="fade" /></h3><p><ResponseStream textStream="با مصرف غذا به‌جای دور ریختن آن، برای آب، انرژی و زحمتی که صرف تولیدش شده ارزش قائلیم" mode="fade" /></p></div></li>
        </ul>
        <Link href="/discover" className="action-link">کشف یک لقمه‌ی خوب <ArrowLeft size={18} aria-hidden="true" /></Link>
      </div>
    </SmoothScrollHero>
  </section>;
}
