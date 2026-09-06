# Design System & Token Architecture — Loqme (لقمه)

> **AUTHORITATIVE DESIGN PRINCIPLE**:  
> Loqme's visual identity is anchored in **White + Deep Teal / Dark Turquoise (سبز کله‌غازی)**.  
> Pure white is the dominant visual canvas (70–85%), Deep Teal (`#0F766E`) is the primary action/accent color, and Dark Charcoal slate (`#0F172A`) governs typography.  
> Every component must consume centralized semantic tokens from `@loqme/design-tokens` and CSS variables, ensuring 100% platform neutrality between Web and future Native Mobile (React Native / Expo).

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
  --color-bg-muted: var(--loqme-neutral-50);
  --color-border-subtle: var(--loqme-neutral-200);
  --color-border-strong: var(--loqme-neutral-300);
  --color-text-primary: var(--loqme-neutral-900);
  --color-text-secondary: var(--loqme-neutral-600);
  --color-text-muted: var(--loqme-neutral-400);
  --color-primary: var(--loqme-primary-600);
  --color-primary-hover: var(--loqme-primary-700);
  --color-primary-soft: var(--loqme-primary-50);
  --color-success: var(--loqme-success-600);
  --color-warning: var(--loqme-warning-600);
  --color-danger: var(--loqme-danger-600);

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
     5. ELEVATION & SHADOWS (Modern Slate)
     ========================================================================== */
  --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.07);
  --shadow-lg: 0 10px 25px rgba(15, 23, 42, 0.10);
  --shadow-card: 0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03);

  /* ==========================================================================
     6. MOTION & CRAFT (Emil Kowalski Design Engineering Tokens)
     ========================================================================== */
  --duration-press: 160ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-smooth: 350ms;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
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

## 5. Core Reusable Component Library

### 5.1 Button
* **Variants**:
  * `Primary`: Solid Deep Teal (`#0F766E`), white text, hover `#115E59`, subtle shadow (`var(--shadow-sm)`).
  * `Secondary`: Soft Teal tint (`#F0FDFA`), Deep Teal text (`#0F766E`), border `#CCFBF1`.
  * `Ghost`: Transparent background, hover `#F1F5F9`, dark text.
  * `Destructive`: Solid Crimson (`#EF4444`), white text, hover `#DC2626`.
* **Sizes**: `sm` (36px min-height), `md` (44px min-height), `lg` (52px min-height).
* **States**: `Default`, `Hover`, `Active` (`transform: scale(0.98)`), `Focus-visible`, `Loading` (integrated `Spinner`), `Disabled`.

### 5.2 Form Inputs & Controls
* **Input**: Minimum 44px height, rounded-xl borders (`var(--radius-md)`), slate border (`#CBD5E1`), focus ring (`rgba(15, 118, 110, 0.15)`), prefix/suffix icons, helper and error text.
* **Select**: Custom RTL chevron on the left, hidden native browser styling, rounded-xl wrapper, deep teal focus rings.

### 5.3 Feedback, Loading & States
* **Skeleton**: Shimmer animated placeholder (`animate-shimmer`), `CardSkeleton` preset matching card layout without content jump.
* **EmptyState**: Centered illustration/icon, clear title, friendly Persian explanation, and primary action button.
* **ErrorState**: Soft rose background (`#FEF2F2`), clear error title, explanatory message, and retry CTA.

### 5.4 Cards & Badges
* **Card**: White canvas, rounded-2xl (`var(--radius-lg)`), `var(--shadow-card)`, interactive hover elevation (`transform: translateY(-2px)`).
* **Badge / Chip**: Full-rounded pill (`var(--radius-full)`), Persian typography:
  * `brand`: Soft teal background (`#F0FDFA`), Deep Teal text (`#0F766E`).
  * `success`: Soft emerald background (`#ECFDF5`), Emerald text (`#059669`).
  * `warning`: Soft amber background (`#FFFBEB`), Amber text (`#D97706`).
  * `danger`: Soft crimson background (`#FEF2F2`), Crimson text (`#DC2626`).
  * `neutral`: Slate gray background (`#F1F5F9`), Slate text (`#334155`).

### 5.5 Navigation & Shells
* **Header**: Sticky top navigation with backdrop blur (`rgba(255, 255, 255, 0.95)`), brand lockup, location indicator, desktop navigation links.
* **Bottom Navigation**: Mobile bottom bar with safe area padding, active indicator pills in soft teal, tactile press feedback.
* **Footer**: Informative Persian footer covering brand mission, food safety charter, city rollout (Urmia & Tehran), and copyright.

