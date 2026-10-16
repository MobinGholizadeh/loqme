"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { useEffect, useState } from "react";
import { Search, MapPin, ShoppingBag, Check, QrCode, Star, Play, Pause, RotateCcw, X, ArrowRight, ArrowLeft, CreditCard, Clock3 } from "lucide-react";
import { DialogSurface } from "@/components/ui/DialogSurface";
import { toPersianDigits } from "@/lib/utils/persian";
const SCENE_MS = 7500;
const DURATION = SCENE_MS * 4;
const scenes = [
  { title: "طعم‌های تازه را کشف و نجات بده", text: "بسته‌های مازاد روزانه فروشگاه‌های نزدیکت را با قیمت استثنایی ببین و مانع هدررفت آن‌ها شو.", label: "کشف و نجات" },
  { title: "انتخاب کن، رزرو کن", text: "بسته دلخواهت را رزرو کن و پیش از پایان مهلت واقعی رزرو، پرداخت آنلاین را انجام بده.", label: "رزرو و پرداخت" },
  { title: "سر وقت، حضوری دریافت کن", text: "در بازه اعلام‌شده به فروشگاه برو و با نشان دادن کد دریافت، بسته نجات‌یافته‌ات را تحویل بگیر.", label: "دریافت" },
  { title: "لذت ببر و ردپای سبکت را بساز", text: "از خوراکی‌های تازه و باکیفیت لذت ببر؛ هر خرید تو، گامی کوچک و مؤثر در مهربانی با طبیعت است.", label: "لذت و طبیعت" },
];
function Illustration({ scene }: { scene: number }) {
  return <div className="explainer-art" aria-hidden="true">
    <div className="explainer-orbit orbit-one"/><div className="explainer-orbit orbit-two"/>
    {scene === 0 && <div className="explainer-phone scene-enter">
      <div className="phone-search"><Search size={18}/><span>کشف لقمه‌های نزدیک</span></div>
      <div className="illustration-map"><span className="map-road"/><MapPin className="animated-pin" size={48}/><MapPin size={28}/></div>
      <div className="phone-offer"><ShoppingBag size={32}/><div><b>یک بسته خوش‌طعم</b><small>از فروشگاه‌های محله</small></div><ArrowLeft size={20}/></div>
    </div>}
    {scene === 1 && <div className="explainer-phone scene-enter">
      <div className="illustration-bag"><ShoppingBag size={70}/></div>
      <b>انتخاب خوش‌طعم تو</b><div className="illustration-row"><Clock3 size={18}/><span>رزرو موقت تا تکمیل پرداخت</span></div>
      <div className="illustration-pay"><CreditCard size={22}/>پرداخت آنلاین</div>
      <span className="illustration-check"><Check size={27}/></span>
    </div>}
    {scene === 2 && <div className="illustration-collection scene-enter">
      <div className="illustration-store"><div className="store-awning"/><b>فروشگاه محله</b><ShoppingBag size={60}/></div>
      <div className="illustration-pass"><QrCode size={75}/><span>کد دریافت سفارش</span><small>در بازه انتخاب‌شده</small></div>
      <span className="illustration-check"><Check size={27}/></span>
    </div>}
    {scene === 3 && <div className="illustration-enjoy scene-enter">
      <div className="illustration-bag"><ShoppingBag size={82}/><span className="illustration-check"><Check size={27}/></span></div>
      <b>یک کشف خوشمزه، یک لبخند به طبیعت</b>
      <div className="illustration-stars">{[0,1,2,3,4].map(i => <Star key={i} size={28} style={{ animationDelay: `${i * 100}ms` }}/>)}</div>
      <span>تجربه و همراهی تو به زمین و محله کمک می‌کند</span>
    </div>}
  </div>;
}
export default function LoqmeExplainer({ onClose }: { onClose: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const scene = Math.max(0, Math.min(scenes.length - 1, Math.floor(elapsed / SCENE_MS)));
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(preference.matches); if (preference.matches) setPlaying(false); };
    const visibility = () => { if (document.hidden) setPlaying(false); };
    update(); preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => { preference.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (!playing || reducedMotion) return;
    let frame: number;
    // Use one clock: a frame's timestamp can precede performance.now() at setup.
    let previousFrame: number | null = null;
    const advance = (now: number) => {
      const delta = previousFrame === null ? 0 : Math.max(0, now - previousFrame);
      previousFrame = now;
      setElapsed(current => Math.max(0, Math.min(DURATION, current + delta)));
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing, reducedMotion]);
  useEffect(() => { if (elapsed >= DURATION) setPlaying(false); }, [elapsed]);
  const goTo = (index: number) => { setPlaying(false); setElapsed(index * SCENE_MS); };
  return <DialogSurface onClose={onClose} label="لقمه چطور کار می‌کند؟">
    <div className="explainer-panel" data-playing={playing && !reducedMotion}>
      <header className="explainer-header"><div><span className="eyebrow">راهنمای خرید از لقمه</span><h2>لقمه چطور کار می‌کند؟</h2></div>
        <RippleButton type="button" className="icon-button" aria-label="بستن راهنما" onClick={onClose}><X size={21}/></RippleButton></header>
      <Illustration key={scene} scene={scene}/>
      <div className="explainer-caption" aria-live="polite" aria-atomic="true">
        <span className="eyebrow">مرحله {toPersianDigits(scene + 1)} از ۴</span><h3>{scenes[scene].title}</h3><p>{scenes[scene].text}</p>
      </div>
      <div className="explainer-controls">
        <div className="explainer-steps" aria-label="مراحل راهنما">{scenes.map((item, index) => <RippleButton key={item.label} type="button"
          aria-current={index === scene ? "step" : undefined} onClick={() => goTo(index)}><span>{toPersianDigits(index + 1)}</span>{item.label}</RippleButton>)}</div>
        <label className="sr-only" htmlFor="explainer-progress">پیشرفت راهنما</label>
        <input id="explainer-progress" type="range" min={0} max={DURATION} step={100} value={elapsed} aria-valuetext={`مرحله ${scene + 1} از ۴`}
          onChange={event => { setPlaying(false); setElapsed(Number(event.target.value)); }}/>
        <div className="explainer-playback">
          <RippleButton type="button" className="icon-button" aria-label="مرحله قبل" disabled={scene === 0} onClick={() => goTo(scene - 1)}><ArrowRight size={20}/></RippleButton>
          {!reducedMotion && <RippleButton type="button" className="action-link" onClick={() => { if (elapsed >= DURATION) setElapsed(0); setPlaying(!playing); }}>
            {playing ? <Pause size={18}/> : <Play size={18}/>} {playing ? "توقف" : "پخش راهنما"}</RippleButton>}
          <RippleButton type="button" className="icon-button" aria-label="مرحله بعد" disabled={scene === 3} onClick={() => goTo(scene + 1)}><ArrowLeft size={20}/></RippleButton>
          <RippleButton type="button" className="icon-button" aria-label="شروع دوباره" onClick={() => { setElapsed(0); setPlaying(!reducedMotion); }}><RotateCcw size={19}/></RippleButton>
          <span className="text-xs text-loqme-neutral-600">{reducedMotion ? "نمایش بدون حرکت" : `${toPersianDigits(Math.floor(elapsed / 1000))} / ۳۰ ثانیه`}</span>
        </div>
      </div>
    </div>
  </DialogSurface>;
}
