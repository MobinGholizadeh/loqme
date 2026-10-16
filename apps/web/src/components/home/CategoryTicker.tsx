"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";

const categories = ["نان تازه", "شیرینی", "قهوه و دسر", "میوه و سبزیجات", "خوراکی‌های محله", "بسته‌های شگفت‌انگیز"];

export function CategoryTicker() {
  const [paused, setPaused] = useState(false);
  return <section className="food-ticker" aria-label="طعم‌هایی برای کشف" data-paused={paused}>
    <div className="food-ticker-window">
      <div className="food-ticker-track">
        {[0, 1].map(copy => <div className="food-ticker-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
          {categories.map(label => <span key={label}>{label}<i aria-hidden="true">✳</i></span>)}
        </div>)}
      </div>
    </div>
    <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "ادامه حرکت دسته‌ها" : "توقف حرکت دسته‌ها"} aria-pressed={paused}>
      {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
    </button>
  </section>;
}
