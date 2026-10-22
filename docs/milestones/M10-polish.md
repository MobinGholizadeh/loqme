# Milestone M10 — UX, SEO, PWA & Performance Specification

> **Milestone**: M10  
> **Title**: UX, SEO, PWA & Performance  
> **Status**: `Completed`  
> **Target Completion**: 100%

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

1. [x] PWA installs cleanly as a standalone app on iOS and Android.
2. [x] Dynamic Open Graph tags display Persian preview when link is shared.
3. [x] Google Rich Results test confirms valid `LocalBusiness` and `Product` schemas.
4. [x] Mobile Lighthouse performance score achieves ≥ 90.
5. [x] Shimmer skeletons and empty states render gracefully across all views.

---

# Checkpoints

- [x] **CP-10.27 — Mobile Account-only login entry (2026-10-16)**: Removed customer and business login actions from the customer header at widths up to 767px. Account in the persistent mobile navigation now owns the signed-out login path and preserves `/profile` as the return destination; desktop/tablet header actions are unchanged. Both optimized-build homepage/navigation browser scenarios, typecheck, zero-warning lint and production build passed. Reviewed signed-out capture: `.artifacts/white-teal/screenshots/home-mobile-signed-out.png`. No backend/API changes or deployment.

- [x] **CP-10.26 — Authentication and mobile-entry refinement (2026-10-16)**: Removed the redundant auth page footer, kept the compact in-card audience link, shortened customer registration helper copy and synchronized the segmented control's visual/accessibility state. The homepage uses its dedicated portrait pickup assets at mobile widths. The mobile header routes through Account, where business sign-in links to `/business/login`. Final validation: 35 focused tests, seven optimized-build browser scenarios, typecheck, zero-warning lint and production build passed. Reviewed captures: `.artifacts/white-teal/screenshots/`. No backend/API changes, generated artwork or deployment.

- [x] **CP-10.24 — Logo teal, food-pickup imagery and glass application (2026-10-15)**: Owner rejected the cream experiment; restored green-glass entry screens with new customer pickup photographs and extended matching teal/blurred-photo surfaces across customer, merchant and admin. Existing layouts, logo artwork, auth loading and business behavior preserved. 65 focused tests and 24 production browser scenarios pass, including all-route accessibility, responsive route matrices, registration, image fallback and transactional flows; workspace types, lint and build pass. [TEAL_GLASS.md](../TEAL_GLASS.md) is authoritative. Captures: `.artifacts/teal-glass/screenshots/`. No deployment or backend/API changes.

- [x] **CP-10.23 business registration follow-up (2026-10-15)**: Extended the merchant scene and loading gate to `/business` and `/business/status`, with glass controls across all five steps and a logo-only shared header. Fixed city-label/skip-link contrast and map-loader status semantics. All 23 production browser scenarios passed across the initial run and two session-configured reruns; workspace types, lint and build passed. Reviewed mobile/desktop captures: `.artifacts/business-registration/`. No backend/API changes or deployment.

- [x] **CP-10.23 business follow-up (2026-10-15)**: Distinct mobile/desktop bakery artwork, merchant-specific benefits and loader, clear store registration, and customer business-entry links leading to `/business/login`. Seven production browser scenarios verify business layouts/contrast, registration navigation, merchant OTP audience/redirect, artwork recovery and customer regression. Workspace typecheck, lint and production build passed. Reviewed captures: `.artifacts/business-auth/`. No backend/API changes or deployment.

- [x] **CP-10.23 botanical authentication (2026-10-15)**: Owner-directed plant references for mobile/desktop login and registration, glass form, responsive artwork and image-decode loading gate with retry/fallback. Existing OTP behavior retained; onboarding/rest of application remain light. 36 focused tests, 7 production browser scenarios, workspace types, lint and production build passed. Responsive/contrast, loading/failure recovery, focus and OTP checks passed; reviewed captures in `.artifacts/botanical-auth/`. Artwork exports are 4K-sized upscales, documented in [BOTANICAL_AUTH.md](../BOTANICAL_AUTH.md). No backend/API changes or deployment.

- [x] **CP-10.22 light correction (2026-10-15)**: Owner-directed white-and-green application, white labels on deeper green actions, logo-only customer navbar and compact footer. Hero and Magic UI effects preserved. Validation passed: 43 focused tests, 24 browser scenarios including accessibility and responsive routes, workspace typecheck, lint and production build. Reviewed captures in `.artifacts/white-green/`; no deployment or backend/API changes. Live provider gates remain open.


- [x] **CP-10.22 — Green Deck + Magic UI application rebuild (2026-10-14/15)**: Explicit owner-requested whole-application visual follow-up. Shared dark tokens, Magic UI ripple buttons/card highlights/page entrances, discovery hero, dark customer/auth/onboarding/merchant/admin surfaces, accessible statuses, local DM Sans/Vazirmatn and PWA chrome. 43 focused tests and 20 browser scenarios passed, including responsive route matrices and accessibility scans; workspace types, lint and production build passed. See [GREEN_DECK.md](../GREEN_DECK.md) and PROJECT_STATUS for final verification. No deployment, migration, commit or push; M12 and existing release gates remain intact.


- [x] **CP-10.21 — Android branding, launch and updates (2026-10-08)**: Official icons, native update entry, shop URL, public versioned downloads and deployment-linked signed release **1.1.123** delivered. Production run 37665504690 passed 958 web tests, eight publication-policy tests, four native policy tests, build/deploy, compiled APK checks and signed emulator upgrade. Anonymous download matches GitHub. Local lint/types/build and three browser scenarios pass. Live update dismissal/daily suppression and signed full-screen launch pass follow-up emulator checks. Physical-device acceptance remains separate; M11 gates stay open. See [ANDROID_RELEASES.md](../ANDROID_RELEASES.md).

- [x] **CP-10.20 — Guest browsing and About Loqme (2026-10-07)**: Customer guest links on phone/OTP screens; public Persian About page, editable content/optional contact fields, footer link and SEO metadata; shared shell accessibility landmarks. 39/39 focused unit tests, 8/8 optimized-build browser tests, build/lint/workspace types pass. Four-width axe/keyboard/layout coverage and screenshots inspected. Existing mobile web/PWA/TWA covered by web changes; physical Android, owner details, SMS.ir review and deployment remain separate. JavaScript-disabled visibility remains limited by the existing root loading boundary. See [GUEST_ABOUT.md](../GUEST_ABOUT.md). Existing M11 gates remain open.

- [ ] **CP-10.18 Search Console follow-through (2026-10-04)**: `c5b0550` deployed, URL-prefix ownership verified, homepage live test passed and indexing request accepted. Ten SEO tests, types and CI pass. Sitemap submission accepted and live Google fetch succeeds, but processing report still shows Couldn't fetch after one resubmission; retain as pending. Manual actions/security reports clear. See [PERSIAN_SEO.md](../PERSIAN_SEO.md).

- [x] **CP-10.19 — Android launch/account security code/release (2026-10-04)**: Pushed/deployed `69fb507`; 936 CI cases, 3 retention tests, 9 browser cases, build/lint/types pass. Production and signed Android release workflows succeed, including live certificate association. Full server disk repaired while retaining containers/two rollback images and all business data. Public readiness/account-retirement/origin checks pass. Physical Android launch acceptance and unpatched development dependency advisory remain open. See [CP10_19_ANDROID_AUTH_SECURITY.md](../CP10_19_ANDROID_AUTH_SECURITY.md).

- [x] **CP-10.18 — Persian brand SEO implementation (2026-10-03)**: User-authorized code and push scope. Static visible Persian homepage identity, WebSite/Organization JSON-LD, home/explore canonicals, auth noindex and sitemap cleanup. 10 focused SEO tests, 3 optimized-build browser tests, build/lint/workspace types pass; mobile screenshot inspected. Google indexing/ranking and deployment verification are separate, pending operational evidence. See [PERSIAN_SEO.md](../PERSIAN_SEO.md).

- [ ] **CP-10.17 — Login persistence (2026-09-28)**: User-authorized production account login-loop repair. Persisted-cookie confirmation, fresh post-login document and private/no-store session/protected responses. 269 fresh database tests, all 95 browser cases and build/lint/types pass; production release checks pending. See [CP10_17_LOGIN_PERSISTENCE.md](../CP10_17_LOGIN_PERSISTENCE.md).

- [x] **CP-10.16 — Store photos and business finder (2026-09-28)**: 266 disposable-database tests, all 92 browser cases, build/lint/types and responsive visual/axe checks pass. Deployed `64937cf` in run 36349502841; live search/map/mobile/login/readiness pass. See [CP10_16_STORE_MEDIA.md](../CP10_16_STORE_MEDIA.md).

- [x] **Production SMS repair (2026-09-27)**: Missing runtime key traced to stale server Compose; `afcd0fe` deployed in run 36333252694. Production OTP returns success; handset receipt unconfirmed. Seven deployment failure/success scenarios pass. See [PRODUCTION_SMS_REPAIR.md](../PRODUCTION_SMS_REPAIR.md).

- [x] **CP-10.15 — Search, merchant loading and mobile reliability (2026-09-24)**: 86 browser tests, build/lint/types and disposable-database CI pass; `1eac59c` deployed in run 35963057596 and live search/mobile/footer/readiness verified. SMS.ir account configuration deferred explicitly. See [CP10_15_RELIABILITY.md](../CP10_15_RELIABILITY.md).

- [x] **CP-10.14 — Mobile discovery, pickup information and quiet guidance (2026-09-22)**: User-authorized scope implemented; 237 tests pass on disposable PostgreSQL, build/lint/types pass. 79/79 browser tests and responsive visual/axe checks pass. UI commit 002a00a deployed in run 35749616079. Doppler workflow repair ea557ae passed build and deployment in run 35906914457; final public UI, cities and readiness checks passed 2026-09-24 with zero browser errors. SMS.ir credential rotation and existing provider/device gates remain open. See [CP10_14_MOBILE.md](../CP10_14_MOBILE.md).

- [x] **CP-10.13 — Navigation, rating rows, localization and onboarding cities (2026-09-22)**: User-authorized follow-up includes full-width centered branding/glass header, horizontal merchant/listing review rows, Persian food tags, local schema repair and production launch-city reference data. 232/232 tests pass on fresh PostgreSQL; build/lint/types and five-width browser/axe checks pass. 71 browser cases validated (70 full-run plus corrected mobile-label rerun); deployed as `adbf39b` in run 35708693920; public header, city onboarding, readiness and guide checks pass. See [CP10_13_PRESENTATION.md](../CP10_13_PRESENTATION.md).

CP-10.12 follow-up (2026-09-22): fixed negative first-frame timing and stale development CSS caching. 16/16 focused browser tests, local worker recovery, build, lint and web/shared typechecks pass. Follow-up `b40ff1f` deployed successfully in run 35658162949.

- [x] **CP-10.12 — Merchant ratings, availability, map controls and explainer (2026-09-22)**: Implemented, validated, pushed to `master` as `32c557e` and deployed successfully in GitHub run 35655051067 (retry after Docker Hub timeout). Public health and guide interactions pass; public data has no current offers or merchant sitemap entries. User-approved scope includes nullable review dimensions, server aggregation and serialized totals, retained unavailable offers, reservation/restocking concurrency fixes, map stacking, and a lazy accessible four-scene guide. Fresh disposable database: 230/230 tests in 25 suites; 64/64 browser tests, four-width visual/axe checks, production build, web/shared types and lint pass. Deployment now verifies backup and runs migrations before replacement, preserves the prior image and verifies readiness. Full evidence and recovery caveats: [CP10_12_MARKETPLACE.md](../CP10_12_MARKETPLACE.md). Existing onboarding provider/device gates are unchanged.

- [ ] **CP-10.11 — Full-screen authentication and business onboarding (2026-09-21)**: Implementation and local acceptance complete; live provider/device acceptance remains open. User-approved follow-on scope explicitly includes application persistence and admin approval despite the historical M10 migration exclusion. Stage 1 `ea129ac`; Stage 2 evidence in [AUTH_ONBOARDING.md](../AUTH_ONBOARDING.md). Customer/business SMS entry, Map.ir/manual first-store registration, editable location/hours, expiring drafts, pending/rejected/approved status, transactional audited approval and nullable pickup defaults. No main DB migration or deployment.
  - [x] Application/UI/schema/API implementation and OTP single-use hardening.
  - [x] Fresh disposable PostgreSQL acceptance: 218/218 tests; web/shared types, lint and final optimized build.
  - [x] Six-width visual inspection and entry-page axe/keyboard/reduced-motion checks.
  - [x] Final optimized-preview browser acceptance: 51/51 tests, including 18 onboarding and 33 existing regression tests.
  - [ ] Dedicated server Map.ir key/API-level live smoke and real-device/live-SMS acceptance. No deployment authorization is implied.

- [x] **CP-10.9 — Merchant feedback fixes (2026-09-14)**: Role-aware navigation and tenant authorization, canonical food categories/temperature, gallery/catalog images, all-region feed and location labels. 180 Vitest and 29 browser tests pass; live isolated API smoke, lint, web/shared types and production build pass. No main DB reseed, migration, deployment or merge.
- [x] **CP-10.10 — Merchant account administration (2026-09-14)**: Per-store linked owner identity/phone/active status, confirmed independent owner replacement, scoped order pagination and staff summaries; atomic audit logging and current-user authorization. Persistent root session state eliminates the false login button. Dialog focus restored after save. Retains OTP authentication; no plaintext passwords, impersonation or migrations. 192/192 Vitest in 20 suites, 33/33 browser tests (plus four account reruns), live isolated merchant/account API smoke, lint, explicit web/shared types and production build pass. Compose files validate with persistent image volumes; Docker image build is not verified because Docker Hub token retrieval timed out. User authorized `master` delivery and Docker push; no deployment.

- [x] **CP-10.8 — Stitch Web Redesign (2026-09-13)**: Implemented on `codex/stitch-ui-redesign`: 16-reference adaptation across existing customer/merchant/admin workflows, discovery-first homepage, shared tokens, responsive layouts, native dialogs and truthful account/receipt states. 160/160 Vitest tests pass on isolated PostgreSQL; web/shared typechecks, lint and production build pass. Browser, screenshot and Lighthouse evidence plus device/provider acceptance limits are in `docs/STITCH_REDESIGN.md`. No merge or deployment; historical production sign-off is not a new release approval.

- [x] **CP-10.1**: Configure PWA manifest, service worker, offline fallback, and install prompt.
- [x] **CP-10.2**: Implement dynamic SEO metadata, Open Graph tags, and Persian sitemap (`/sitemap.xml`).
- [x] **CP-10.3**: Implement JSON-LD Structured Data (`LocalBusiness`, `Product`, `Offer`).
- [x] **CP-10.4**: Implement polished skeleton loaders, empty states, and error boundaries.
- [x] **CP-10.5**: Audit Persian typography, font-display, and numeral formatting.
- [x] **CP-10.6**: Optimize image pipeline (`next/image`) and bundle sizes.
- [x] **CP-10.7**: Run Lighthouse audits and execute accessibility refinements.

---

# Definition of Done

* Lighthouse scores meet all threshold targets (Performance ≥ 90, SEO ≥ 100).
* PWA verified functional on physical mobile devices.
* Checkpoints completed and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with Lighthouse audit results and PWA status.

- [x] **CP-10.25 — White-first surfaces and introductory homepage (2026-10-16):** Owner-authorized visual/navigation follow-up; implemented and locally verified: 65 focused tests, 23 distinct production browser scenarios across runs/reruns, responsive screenshots, all-route axe, typecheck, lint and production build passed. See [WHITE_TEAL.md](../WHITE_TEAL.md). No backend changes or deployment.
- [x] **CP-10.26 — Authentication and mobile-entry refinement (2026-10-16):** Auth footer removal, compact registration mode, responsive portrait homepage art and Account-based mobile business entry completed and locally verified. See [WHITE_TEAL.md](../WHITE_TEAL.md). No backend changes or deployment.
- [x] **CP-10.27 — Mobile Account-only login entry (2026-10-16):** Mobile customer headers now show no login buttons; Account owns the signed-out login path. Desktop remains unchanged. See [WHITE_TEAL.md](../WHITE_TEAL.md). No backend changes or deployment.
- [x] **CP-10.28 — Homepage motion, hero type and Persian punctuation (2026-10-22):** Fixed the React Bits `SplitText` heading tag so hero lines inherit the intended display size, verified Lenis initialization in the responsive homepage browser test, and removed sentence-ending ASCII full stops from Persian application copy while preserving decimals, versions and domains. All 1,011 tests pass against a disposable RLS-enabled PostgreSQL database; typecheck, zero-warning lint, production build and both responsive homepage browser scenarios also pass. See [WHITE_TEAL.md](../WHITE_TEAL.md).
- [x] **CP-10.28 release follow-up (2026-10-22):** Production source `a20d203` is live and verified for hero sizing, Lenis easing, punctuation and database readiness. Constrained the API-35 emulator data partition to 2 GB after GitHub-hosted runners twice lacked space for the default 7.37 GB AVD; the release-policy suite guards the workflow setting.
