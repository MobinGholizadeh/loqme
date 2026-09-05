# Milestone M10 — UX, SEO, PWA & Performance Specification

> **Milestone**: M10  
> **Title**: UX, SEO, PWA & Performance  
> **Status**: `Pending`  
> **Target Completion**: 0%

---

# Objective

Elevate the platform to consumer-grade visual elegance and performance excellence: implement Progressive Web App (PWA) capabilities, complete Persian search engine optimization (SEO) with Schema.org structured data, refine mobile touch interactions, polish Persian typography, and ensure comprehensive loading, empty, and error state coverage.

---

# Context

A consumer marketplace succeeds on first impressions, smooth performance, and effortless search discoverability. M10 polishes every touchpoint, eliminates jank, ensures sub-second navigation, and optimizes the platform for search engines and home screen installation on Iranian mobile networks.

---

# Dependencies

* **M09 — Marketplace Analytics** (core features and analytics operational).

---

# Scope

* Progressive Web App (PWA):
  * Web App Manifest (`manifest.json`): Persian app name (`لقمه`), short name, icons (192x192, 512x512, maskable), theme color (`#F97316`), background color (`#FFFDF9`), standalone display mode.
  * Service Worker: Offline fallback page, precaching of Vazirmatn font files and core CSS tokens.
  * "Add to Home Screen" (A2HS) custom install prompt for iOS Safari and Android Chrome.
* Comprehensive Persian SEO & Metadata:
  * Dynamic metadata generation via Next.js Metadata API for all merchants and listings.
  * Persian Open Graph and Twitter Card preview tags.
  * JSON-LD Structured Data:
    * `Schema.org/LocalBusiness` on merchant profile pages (coordinates, opening hours, Persian address).
    * `Schema.org/Product` and `Schema.org/Offer` on listing pages (Toman currency, availability, price).
  * Automated XML sitemap (`/sitemap.xml`) indexing active cities, neighborhoods, and verified merchants.
  * `robots.txt` configuration shielding admin and merchant private routes.
* Visual Polish & Design System Refinement:
  * Vazirmatn font-display swap optimization and Persian numeral rendering consistency.
  * Polished loading skeletons (shimmer animation) for listing cards, map pins, and checkout screens.
  * Warm, informative empty states (e.g. «در حال حاضر لقمه فعالی در این محله وجود ندارد. محله دیگری را امتحان کنید.»).
  * Graceful error boundaries with retry buttons.
  * Subtle micro-animations (card hover lift, heart toggle bounce, bottom sheet spring physics).
* Performance & Accessibility (a11y):
  * Image optimization with `next/image` using AVIF/WebP formats and responsive `sizes`.
  * WCAG 2.1 AA contrast audit across all color tokens.
  * Minimum touch target size compliance (≥ 44x44px).
  * Google Lighthouse performance score optimization (Target: ≥ 90 on mobile).

---

# Out of Scope

* Architectural overhauls or database schema migrations.
* New business transaction models.

---

# Functional Requirements

1. Users on Chrome or Safari mobile can install Loqme as a standalone PWA icon on their home screen.
2. Sharing a listing link on Telegram, WhatsApp, or Twitter renders a rich Persian title, image, and price preview.
3. Every page renders without layout shifts (CLS < 0.1).

---

# UX Requirements

1. App feels smooth, responsive, and native on mobile devices.
2. Skeleton loaders match the exact geometric shapes of incoming listing cards.
3. Interactive elements provide immediate visual tactile feedback upon tap.

---

# Technical Requirements

1. Server-side metadata generated dynamically per listing route.
2. Next.js bundle optimization: Dynamic imports for heavy client libraries (Leaflet maps, camera scanner).
3. Lighthouse performance, accessibility, and SEO audits run in headless CI/CD.

---

# Database Requirements

* Read queries for sitemap generation optimized with indexed fields (`Merchant.slug`, `Listing.status`).

---

# Security Requirements

* Service worker cache strictly excludes authenticated API routes (`/api/auth/*`, `/api/checkout/*`).
* `robots.txt` explicitly disallows crawling of `/admin/*`, `/merchant/*`, and `/api/*`.

---

# Testing Requirements

* **Lighthouse Audit**: Mobile Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 100.
* **Structured Data Test**: Validate generated JSON-LD using Google Rich Results test tool.
* **PWA Verification**: Verify standalone installation, offline banner, and service worker registration.

---

# Acceptance Criteria

1. [ ] PWA installs cleanly as a standalone app on iOS and Android.
2. [ ] Dynamic Open Graph tags display Persian preview when link is shared.
3. [ ] Google Rich Results test confirms valid `LocalBusiness` and `Product` schemas.
4. [ ] Mobile Lighthouse performance score achieves ≥ 90.
5. [ ] Shimmer skeletons and empty states render gracefully across all views.

---

# Checkpoints

- [ ] **CP-10.1**: Configure PWA manifest, service worker, offline fallback, and install prompt.
- [ ] **CP-10.2**: Implement dynamic SEO metadata, Open Graph tags, and Persian sitemap (`/sitemap.xml`).
- [ ] **CP-10.3**: Implement JSON-LD Structured Data (`LocalBusiness`, `Product`, `Offer`).
- [ ] **CP-10.4**: Implement polished skeleton loaders, empty states, and error boundaries.
- [ ] **CP-10.5**: Audit Persian typography, font-display, and numeral formatting.
- [ ] **CP-10.6**: Optimize image pipeline (`next/image`) and bundle sizes.
- [ ] **CP-10.7**: Run Lighthouse audits and execute accessibility refinements.

---

# Definition of Done

* Lighthouse scores meet all threshold targets (Performance ≥ 90, SEO ≥ 100).
* PWA verified functional on physical mobile devices.
* Checkpoints completed and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with Lighthouse audit results and PWA status.
