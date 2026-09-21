"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Play, ArrowLeft } from "lucide-react";
const Explainer = dynamic(() => import("./LoqmeExplainer"), { ssr: false });
export function HowItWorksButton({ card = false }: { card?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={card ? "how-it-works-card" : "how-it-works-link"} onClick={() => setOpen(true)}>
      <span className="how-play"><Play size={card ? 24 : 18} aria-hidden="true"/></span>
      <span><strong>لقمه چطور کار می‌کند؟</strong>{card && <small>از کشف یک طعم تازه تا دریافت بسته، در ۳۰ ثانیه</small>}</span>
      {card && <ArrowLeft size={20} aria-hidden="true"/>}
    </button>
    {open && <Explainer onClose={() => setOpen(false)}/>}
  </>;
}
