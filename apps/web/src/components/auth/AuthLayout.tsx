"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShoppingBag, Sparkles, Sprout, Store, PackageCheck, UsersRound } from "lucide-react";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";
import { HowItWorksButton } from "@/components/how-it-works/HowItWorksButton";
import { Button } from "@/components/ui/Button";

type SceneState = "loading" | "slow" | "error" | "ready" | "fallback";

export function AuthLayout({ children, business = false }: { children: React.ReactNode; business?: boolean }) {
  const pathname = usePathname();
  return <BotanicalAuthLayout key={business ? "business" : "customer"} business={business} onboarding={business && pathname !== "/business/login"}>{children}</BotanicalAuthLayout>;
}

function BotanicalAuthLayout({ children, business, onboarding }: { children: React.ReactNode; business: boolean; onboarding: boolean }) {
  const [scene, setScene] = useState<SceneState>("loading");
  const [attempt, setAttempt] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const restoredFocus = useRef(false);
  const visible = scene === "ready" || scene === "fallback";
  const suffix = attempt ? `?retry=${attempt}` : "";
  const assetPrefix = business ? "loqme-business" : "loqme";
  const SceneIcon = business ? Store : ShoppingBag;
  const features = business
    ? [{ icon: PackageCheck, label: "مدیریت بسته‌ها و زمان دریافت" }, { icon: UsersRound, label: "دسترسی به مشتریان تازه محله" }, { icon: Sprout, label: "فروش موجودی مازادِ سالم" }]
    : [{ icon: ShoppingBag, label: "کشف خوراکی‌های تازه محله" }, { icon: Sparkles, label: "خرید هوشمندانه، با قیمت بهتر" }, { icon: Sprout, label: "غذای کمتر هدررفته، زمین سبزتر" }];
  const srcSet = (kind: string, widths: number[]) => widths.map(width => `/images/auth/${assetPrefix}-${kind}-${width}.webp${suffix} ${width}w`).join(", ");

  const reveal = useCallback(async (image: HTMLImageElement) => {
    try {
      await image.decode();
      if (imageRef.current === image && image.naturalWidth > 0) {
        setScene(current => current === "fallback" ? current : "ready");
      }
    } catch {
      if (imageRef.current === image) setScene(current => current === "fallback" ? current : "error");
    }
  }, []);

  useEffect(() => {
    const image = imageRef.current;
    // The download can finish (or fail) before hydration attaches load/error handlers.
    if (image?.complete) void reveal(image);
    const timer = window.setTimeout(() => setScene(current => current === "loading" ? "slow" : current), 12000);
    return () => window.clearTimeout(timer);
  }, [attempt, reveal]);

  useEffect(() => {
    if (visible && restoredFocus.current) {
      mainRef.current?.focus();
      restoredFocus.current = false;
    }
  }, [visible]);

  return <div className="botanical-auth" data-scene={scene} data-audience={business ? "business" : "customer"} data-mode={onboarding ? "onboarding" : "login"}>
    {!visible && <div className="botanical-loading">
      <div className="botanical-loading-leaf" aria-hidden="true"><SceneIcon size={42} strokeWidth={1.4} /></div>
      <div role="status" aria-live="polite">
        <p className="botanical-loading-title">{business ? "فرصت تازه‌ای برای فروشگاه شما" : "یک شروع تازه با لقمه"}</p>
        <p>{scene === "error" ? "تصویر بارگیری نشد. دوباره تلاش کنید یا بدون تصویر ادامه دهید." : scene === "slow" ? "بارگیری کمی طول کشیده؛ هنوز در حال آماده‌سازی تصویر هستیم." : business ? "در حال آماده‌سازی ورودی فروشگاه…" : "در حال آماده‌سازی تجربه لقمه…"}</p>
      </div>
      {(scene === "slow" || scene === "error") && <div className="botanical-loading-actions">
        <Button onClick={() => { restoredFocus.current = true; setScene("loading"); setAttempt(value => value + 1); }}>تلاش دوباره</Button>
        <Button variant="outline" onClick={() => { restoredFocus.current = true; setScene("fallback"); }}>ادامه بدون تصویر</Button>
      </div>}
      <Link href="/" className="botanical-loading-back">بازگشت به خانه</Link>
    </div>}

    <div className="botanical-experience" inert={!visible} aria-hidden={!visible}>
      <picture className="botanical-scene" key={attempt}>
        <source media="(max-width: 767px)" srcSet={srcSet("mobile", [480, 960, 2160])} sizes="100vw" />
        {/* Pre-sized static variants avoid optimizer cold starts and support portrait art direction. */}
        <img ref={imageRef} src={`/images/auth/${assetPrefix}-desktop-1920.webp${suffix}`} srcSet={srcSet("desktop", [1280, 1920, 2560, 3840])} sizes="100vw" width={3840} height={2160} alt="" fetchPriority="high" loading="eager" decoding="async" onLoad={event => void reveal(event.currentTarget)} onError={() => setScene(current => current === "fallback" ? current : "error")} />
      </picture>
      <div className="botanical-shade" aria-hidden="true" />
      <a className="skip-link" href="#auth-content">رفتن به فرم</a>
      <header className="botanical-header">
        <Link href="/" aria-label="صفحه اصلی لقمه" className="botanical-brand"><LoqmeLogo theme="teal" variant="icon" size={38} /></Link>
        <nav aria-label="ناوبری ورود">
          <HowItWorksButton />
          <Link href="/"><ArrowRight size={17} aria-hidden="true" /><span>بازگشت به خانه</span></Link>
        </nav>
      </header>

      <div className="botanical-layout">
        <aside className="botanical-message">
          <span className="botanical-eyebrow"><SceneIcon size={16} aria-hidden="true" />{business ? "همراه کسب‌وکارهای محلی" : "کشف تازه‌ای از محله"}</span>
          <h2>{business ? <>خوراکی‌های<br />خوب شما،<br /><em>کشف بعدی محله.</em></> : <>خوراکی‌های خوب،<br />قیمت‌های بهتر،<br /><em>همین نزدیکی.</em></>}</h2>
          <p>{business ? "با لقمه، خوراکی‌های فروشگاهتان را به کشف تازه‌ای برای اهالی محله تبدیل کنید." : "طعم‌های تازه را کشف کن، به‌صرفه‌تر خرید کن و با کمتر هدر دادن غذا، سهمی در مراقبت از زمین داشته باش."}</p>
          <ul>{features.map(({ icon: Icon, label }) => <li key={label}><Icon size={20} aria-hidden="true" /><span>{label}</span></li>)}</ul>
        </aside>
        <main id="auth-content" ref={mainRef} className="botanical-card" tabIndex={-1}>
          <div className="botanical-mobile-intro">{business ? <Store size={16} aria-hidden="true" /> : <ShoppingBag size={16} aria-hidden="true" />}<span>{business ? "همراه کسب‌وکارهای محلی" : "کشف تازه‌ای از محله"}</span></div>
          {children}
          <div className="botanical-card-footer">
            <Link href={business ? "/login" : "/business/login"}>{business ? "ورود مشتری" : "ثبت‌نام / ورود کسب‌وکار"}</Link>
            <p><SceneIcon size={15} aria-hidden="true" />{business ? "از موجودی امروز، فرصت تازه بسازید." : "یک خرید خوش‌طعم، با دورریز کمتر."}</p>
          </div>
        </main>
      </div>
    </div>
  </div>;
}
