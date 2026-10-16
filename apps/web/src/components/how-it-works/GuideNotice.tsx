"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { HowItWorksButton } from "./HowItWorksButton";

export function GuideNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { setVisible(sessionStorage.getItem("loqme-guide-dismissed") !== "1"); }
    catch { setVisible(true); }
  }, []);
  if (!visible) return null;
  return <aside className="guide-notice" aria-label="راهنمای خرید از لقمه">
    <div><span>اولین بار است به لقمه سر می‌زنید؟</span><HowItWorksButton/></div>
    <RippleButton className="icon-button" type="button" aria-label="بستن پیشنهاد راهنما" onClick={() => {
      setVisible(false);
      try { sessionStorage.setItem("loqme-guide-dismissed", "1"); } catch { /* Dismiss for this visit even without storage. */ }
    }}><X size={18} aria-hidden="true"/></RippleButton>
  </aside>;
}
