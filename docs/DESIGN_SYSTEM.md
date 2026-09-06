# Design System & Token Architecture — Loqme (لقمه)

> **IMPORTANT ARCHITECTURAL RULE**:  
> The developer will later provide the definitive design scale. The developer-provided design scale becomes the ultimate source of truth.  
> Components must consume **semantic tokens** (CSS variables / design constants) rather than hardcoded magic values so the entire scale can be adjusted or replaced in one place without refactoring component code.

---

## 1. Centralized CSS Custom Properties (Tokens)

```css
:root {
  /* ==========================================================================
     1. COLOR PALETTE TOKENS — White + Teal / Dark Turquoise (سبز کله‌غازی)
     ========================================================================== */
  /* Primary Brand: Sophisticated Dark Turquoise / Deep Teal */
  --loqme-primary-50: #F0FDFA;  /* Subtle soft background tint */
  --loqme-primary-100: #CCFBF1; /* Subtle border / light chips */
  --loqme-primary-200: #99F6E4; /* Soft accent borders */
  --loqme-primary-300: #5EEAD4;
  --loqme-primary-400: #2DD4BF;
  --loqme-primary-500: #0D9488; /* Vibrant Teal Accent */
  --loqme-primary-600: #0F766E; /* Base Brand / Primary CTA (سبز کله‌غازی عمیق) */
  --loqme-primary-700: #115E59; /* Hover / Active CTA */
  --loqme-primary-800: #134E4A; /* Deep Contrast Text */
  --loqme-primary-900: #042F2E; /* Darkest Teal */

  /* Neutrals & Slate Charcoal (Clean White dominant canvas) */
  --loqme-neutral-0: #FFFFFF;
  --loqme-neutral-25: #FFFFFF; /* Pure White Canvas (70-85% of visual area) */
  --loqme-neutral-50: #F8FAFC; /* Secondary Card / Subtle Surface */
  --loqme-neutral-100: #F1F5F9;
  --loqme-neutral-200: #E2E8F0; /* Subtle Borders */
  --loqme-neutral-300: #CBD5E1; /* Input Borders */
  --loqme-neutral-400: #94A3B8;
  --loqme-neutral-500: #64748B;
  --loqme-neutral-600: #475569; /* Secondary Text */
  --loqme-neutral-700: #334155;
  --loqme-neutral-800: #1E293B;
  --loqme-neutral-900: #0F172A; /* Primary Text (Deep Charcoal) */
  --loqme-neutral-950: #020617;

  /* Semantic Accents: Trust, Safety & Savings (Restrained Emerald) */
  --loqme-success-50: #ECFDF5;
  --loqme-success-100: #D1FAE5;
  --loqme-success-500: #10B981;
  --loqme-success-600: #059669;
  --loqme-success-700: #047857;

  /* Semantic Urgency / Warnings (Warm Amber) */
  --loqme-warning-50: #FFFBEB;
  --loqme-warning-100: #FEF3C7;
  --loqme-warning-500: #F59E0B;
  --loqme-warning-600: #D97706;

  /* Semantic Danger / Violations (Crimson) */
  --loqme-danger-50: #FEF2F2;
  --loqme-danger-100: #FEE2E2;
  --loqme-danger-500: #EF4444;
  --loqme-danger-600: #DC2626;

  /* Semantic Surface & Border Aliases */
  --color-bg-canvas: var(--loqme-neutral-25);
  --color-bg-surface: var(--loqme-neutral-0);
  --color-bg-muted: var(--loqme-neutral-100);
  --color-border-subtle: var(--loqme-neutral-200);
  --color-border-strong: var(--loqme-neutral-300);
  --color-text-primary: var(--loqme-neutral-900);
  --color-text-secondary: var(--loqme-neutral-600);
  --color-text-muted: var(--loqme-neutral-400);
  --color-primary: var(--loqme-primary-500);
  --color-primary-hover: var(--loqme-primary-600);

  /* ==========================================================================
     2. SPACING SCALE (Base 4px)
     ========================================================================== */
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* ==========================================================================
     3. TYPOGRAPHY SCALE (Vazirmatn)
     ========================================================================== */
  --font-family-base: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* ==========================================================================
     4. RADIUS SCALE
     ========================================================================== */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* ==========================================================================
     5. ELEVATION & SHADOWS (Warm Ambient)
     ========================================================================== */
  --shadow-xs: 0 1px 2px rgba(24, 24, 27, 0.04);
  --shadow-sm: 0 2px 4px rgba(24, 24, 27, 0.06);
  --shadow-md: 0 4px 12px rgba(24, 24, 27, 0.08);
  --shadow-lg: 0 8px 24px rgba(24, 24, 27, 0.12);
  --shadow-card: 0 2px 8px rgba(124, 45, 18, 0.04), 0 1px 2px rgba(24, 24, 27, 0.04);

  /* ==========================================================================
     6. MOTION & TRANSITIONS
     ========================================================================== */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-smooth: 350ms;
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
}
```

---

## 2. Responsive Breakpoints

| Token | Width | Target Device |
| :--- | :--- | :--- |
| `sm` | `640px` | Large mobile / phablets |
| `md` | `768px` | Tablets & small iPads |
| `lg` | `1024px` | Laptops / Desktop split view |
| `xl` | `1280px` | Wide desktop monitors |

*Mobile First Policy*: All core interfaces are designed and optimized primarily for viewport widths between `360px` and `430px`, then scaled gracefully to desktop.

---

## 3. RTL Rules & Bidirectional Layouts

1. **Logical Properties Only**: Always write CSS using logical properties rather than physical sides:
   * Use `margin-inline-start` / `margin-inline-end` instead of `margin-left` / `margin-right`.
   * Use `padding-inline-start` / `padding-inline-end` instead of `padding-left` / `padding-right`.
   * Use `inset-inline-start` / `inset-inline-end` instead of `left` / `right`.
2. **Icon Mirroring**: Directional icons (arrows, chevrons, navigation indicators) must flip dynamically in RTL mode (`transform: scaleX(-1)`).
3. **Numerals**: Render prices and counts using Persian numeral converters (e.g. `۲۵,۰۰۰ تومان`).

---

## 4. Accessibility (a11y) Standards

* **Color Contrast**: All text must achieve minimum WCAG 2.1 AA contrast ratio (4.5:1 for body text, 3:1 for large headings).
* **Touch Targets**: All clickable interactive buttons, cards, and inputs must have minimum physical touch dimensions of **`44px × 44px`**.
* **Focus Rings**: Keyboard navigation must display a clear, non-intrusive focus ring (`outline: 2px solid var(--loqme-primary-500)`).
* **Screen Reader Tags**: All non-text elements (icons, badges, progress spinners) must have `aria-label` or `aria-hidden="true"`.

---

## 5. Core Reusable Component Conventions

### 5.1 Button
* Variants: `Primary` (Orange Solid), `Secondary` (Orange Muted / Outline), `Tertiary` (Ghost), `Destructive` (Crimson).
* Sizes: `sm` (36px), `md` (44px), `lg` (52px).
* States: `Default`, `Hover`, `Active`, `Loading` (animated spinner), `Disabled`.

### 5.2 Surprise Bag Card
* Elevation: `var(--shadow-card)` with smooth hover lift (`transform: translateY(-2px)`).
* Visual Structure:
  1. Store photo & verified safety badge.
  2. Pickup countdown banner.
  3. Bag category title & remaining stock indicator.
  4. Anchor price (struck through) + Discount badge + Net Toman price.

### 5.3 Bottom Navigation & Modals
* Mobile bottom sheet pattern for filters, details, and checkout review.
* Backdrop blur: `backdrop-filter: blur(8px); background: rgba(255, 255, 255, 0.85);`.
