"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Play } from "lucide-react";
const Explainer = dynamic(() => import("./LoqmeExplainer"), { ssr: false });
export function HowItWorksButton() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="how-it-works-link" onClick={() => setOpen(true)}>
      <span className="how-play"><Play size={18} aria-hidden="true"/></span>
      <span><strong>لقمه چطور کار می‌کند؟</strong></span>
    </button>
    {open && <Explainer onClose={() => setOpen(false)}/>}
  </>;
}
