# Living Project Status Tracker — Loqme (لقمه)

> **CRITICAL PROTOCOL**: This is a living operational document.  
> Future agents must inspect this file before undertaking any milestone work, and update it immediately upon completing checkpoints.  
> Do not rely on conversational memory. Never mark incomplete work as complete.

---

## 1. Project Health & Current State

| Metric | Status |
| :--- | :--- |
| **Current Milestone** | **Ready for M07 — Merchant Product** |
| **Milestone Status** | `Milestone Completed` (M06 Trust, Safety & Moderation Completed & Verified) |
| **Overall Completion** | `64%` (M00 100%, M01 100%, Post-M01 Refactor 100%, M02 100%, M03 100%, M04 100%, M04-UI 100%, M05 100%, M06 100%) |
| **Repository State** | Monorepo Active (`apps/web`, `packages/*`, PostgreSQL 15 + PostGIS 3.4 running) |
| **Last Updated** | 2026-09-10 (M06 Trust, Safety & Moderation Completed: Verified Reviews, Food Safety Lockout & 1-Click Refund Verified) |

---

## 2. Technology Stack & Operational Environment

* **Runtime**: Node.js `v20.17.0` (Active on Windows host)
* **Package Manager**: `npm` `11.10.0` (via `npm.cmd` / `npx.cmd`) with npm workspaces (`apps/*`, `packages/*`)
* **Monorepo Architecture**:
  * `apps/web`: Next.js 14.2.23 (App Router), React 18, TypeScript 5, Leaflet 1.9
  * `apps/mobile`: [Future] React Native / Expo Client
  * `packages/types`: `@loqme/types` (Domain contracts, RBAC, API wrappers, Marketplace, Orders, Payments, Financial Transactions, Moderation, Reviews, Complaints, AuditLogs)
  * `packages/validation`: `@loqme/validation` (Zod schemas, Iranian mobile, Checkout, Reviews, Complaints, Safety Override schemas)
  * `packages/design-tokens`: `@loqme/design-tokens` (White + Teal palette, Emil Kowalski motion)
  * `packages/api`: `@loqme/api` (Universal fetch-based API client, Bearer & Cookie auth)
  * `packages/config`: `@loqme/config` (Shared tsconfig presets)
* **Database**: PostgreSQL 15 with PostGIS 3.4 (Active via Docker container `loqme-postgres` on port 5432)
* **ORM & Migrations**: Prisma ORM `v5.22.0` with migrations:
  * `0001_init_auth_users`
  * `20260906201522_core_domain_entities`
  * `20260907000300_add_favorites_table`
  * `20260907001800_orders_payments_ledger` (Reservation, Order, Payment, FinancialTransaction, Refund)
  * `20260910000000_pickup_verification` (PickupVerification)
  * `20260910010000_trust_safety_moderation` (Review, Complaint, AuditLog)
* **Security & Auth**: Universal Dual-Mode Auth (CSPRNG 5-digit OTP, signed `jose` JWT via either `Authorization: Bearer <token>` or HttpOnly `loqme_session` cookie)
* **Styling**: Centralized Token Architecture in `@loqme/design-tokens`, Vazirmatn font, RTL-first (`dir="rtl"`)
* **Version Control**: Git initialized on `master` branch

---

## 3. Milestone Completion Summary

| Milestone | Title | Status | Completion % |
| :--- | :--- | :--- | :--- |
| **M00** | **Project Discovery & Architecture** | `Completed` | `100%` |
| **M01** | **Application Foundation** | `Completed` | `100%` |
| **Post-M01** | **Mobile-Readiness Architecture Refactor** | `Completed` | `100%` |
| **M02** | **Core Domain & Database** | `Completed` | `100%` |
| **M03** | **Marketplace Discovery** | `Completed` | `100%` |
| **M04** | **Orders, Inventory & Payments** | `Completed` | `100%` |
| **M04-UI** | **UI/UX & Design System Checkpoint** | `Completed` | `100%` |
| **M05** | **Pickup Verification** | `Completed` | `100%` |
| **M06** | **Trust, Safety & Moderation** | `Completed` | `100%` |
| **M07** | Merchant Product | `Pending` | `0%` |
| **M08** | Admin Platform | `Pending` | `0%` |
| **M09** | Marketplace Analytics | `Pending` | `0%` |
| **M10** | UX, SEO, PWA & Performance | `Pending` | `0%` |
| **M11** | Production Readiness | `Pending` | `0%` |

---

## 4. Completed Milestones Checklists

### Milestone M00 Checklist
- [x] **C0.1 — Repository Inspection**: Completed environmental inspection.
- [x] **C0.2 — Authoritative Governance Setup**: Authored authoritative `AGENTS.md` and `README.md`.
- [x] **C0.3 — Product & Behavioral Architecture**: Authored `PRODUCT.md`, `PRODUCT_PRINCIPLES.md`, `UX_PSYCHOLOGY.md`, and `BRAND.md`.
- [x] **C0.4 — System Design & Token Architecture**: Authored `DESIGN_SYSTEM.md` and `ARCHITECTURE.md`.
- [x] **C0.5 — Domain & Economic Modeling**: Authored `DATA_MODEL.md` and `BUSINESS_MODEL.md`.
- [x] **C0.6 — Safety, Security & Legal Registries**: Authored `SECURITY.md`, `FOOD_SAFETY.md`, and `LEGAL_ASSUMPTIONS.md`.
- [x] **C0.7 — Roadmap & Milestone Specifications**: Authored `ROADMAP.md` and all 12 individual milestone specification files (`M00` through `M11`).
- [x] **C0.8 — Final Consistency Audit & M00 Sign-off**: Signed off and transitioned to M01.

### Milestone M01 Checklist
- [x] **CP-01.1**: Initialize Next.js 14, TypeScript, ESLint, and vitest configuration.
- [x] **CP-01.2**: Configure design tokens, CSS variables, and Vazirmatn font in RTL mode (`globals.css`).
- [x] **CP-01.3**: Configure PostgreSQL database (Docker Compose) and Prisma ORM setup (`0001_init_auth_users` migration applied, seeded).
- [x] **CP-01.4**: Build Auth Domain Service, CSPRNG OTP generation, rate limiting, and signed session cookie middleware.
- [x] **CP-01.5**: Build base UI primitives (`Button`, `Input`, `Card`, `Badge`, `Modal`, `Spinner`) with Emil Kowalski motion tokens.
- [x] **CP-01.6**: Build Customer, Merchant, and Admin layout shells.
- [x] **CP-01.7**: Write unit and integration tests (18 tests passing); verify clean production build (`npm run build` exit code 0).

### Post-M01 Mobile-Readiness Refactor Checklist
- [x] **CP-MR.1 — Architecture Audit**: Comprehensive audit of Web coupling, auth transport, validation, tokens, and boundaries.
- [x] **CP-MR.2 — Monorepo Workspaces Setup**: Migrated repository to npm workspaces (`apps/*`, `packages/*`); relocated Web to `apps/web`.
- [x] **CP-MR.3 — Shared Types Extraction**: Extracted `@loqme/types` containing RBAC hierarchy, user/session contracts, and domain models.
- [x] **CP-MR.4 — Shared Validation Extraction**: Extracted `@loqme/validation` containing Zod schemas and universal Persian string/digit utilities.
- [x] **CP-MR.5 — Shared Design Tokens Extraction**: Extracted `@loqme/design-tokens` with White + Teal palette and motion curves.
- [x] **CP-MR.6 — Universal API Client**: Implemented `@loqme/api` supporting normalized error handling and dual Bearer/Cookie transport.
- [x] **CP-MR.7 — Universal Dual-Mode Auth**: Upgraded backend auth route handlers and middleware to accept `Authorization: Bearer <token>` and return `token` in JSON response.
- [x] **CP-MR.8 — Documentation Suite**: Authored `docs/MOBILE_ARCHITECTURE.md`, `docs/decisions/ADR-001-mobile-architecture.md`, and updated `AGENTS.md` and `ROADMAP.md`.
- [x] **CP-MR.9 — Validation Suite**: 25/25 Vitest tests passing, 0 TypeScript errors (`tsc --noEmit`), 0 ESLint warnings, production build exit code 0.

### Milestone M02 Checklist
- [x] **CP-02.1 — Prisma Schema Expansion**: Defined core domain models (`Province`, `City`, `Neighborhood`, `MerchantLocation`, `MerchantHours`, `Category`, `Listing`, `ListingImage`, `ListingInventory`, `ListingSafety`, `ListingAttributes`) and enums (`ListingType`, `ListingStatus`, `SafetyStatus`, `TemperatureRequirement`).
- [x] **CP-02.2 — PostGIS & Database Constraints**: Applied migration `20260906201522_core_domain_entities` with PostGIS 3.4 extension, auto-sync geography trigger, GIST spatial index (`idx_merchant_location_geom`), and PostgreSQL check constraints (`chk_inventory_non_negative`, `chk_listing_price_consistency`, `chk_listing_pickup_window`).
- [x] **CP-02.3 — Core Domain Services**: Built `MerchantService` (with PostGIS `ST_Distance` and `ST_DWithin` radius search), `ListingService` (atomic transaction creation with price/window guards), and `InventoryService` (atomic reservation and anti-overselling locks).
- [x] **CP-02.4 — Persian Seed Suite (Urmia First, Tehran Expansion)**: Seeded West Azerbaijan (Urmia) with 7 neighborhoods (دانشکده، شیخ‌تپه، استادان، خیام، کاشانی، بهداری، امام) as Phase 1 launch market, plus Tehran with 5 neighborhoods, 6 food categories, 12 authentic merchants, and 25 realistic surplus listings (Surprise Bags & Flash Deals) with authentic Toman pricing.
- [x] **CP-02.5 — Validation & Integration Tests**: 35/35 tests passing across 6 suites verifying PostGIS queries (in both Urmia and Tehran), atomic domain provisioning, and database check constraint enforcement.

### Milestone M03 Checklist
- [x] **CP-03.1 — PostGIS Spatial Discovery API**: Implemented `/api/listings/nearby` with PostGIS `ST_DWithin` and `ST_Distance` queries, supporting coordinate parameters, radius boundaries, business types, and distance ordering.
- [x] **CP-03.2 — Homepage Discovery Shell & Hero**: Built dynamic hero banner («امروز چه طعم تازه‌ای در محله شما منتظر کشف است؟»), Urmia neighborhood selector (دانشکده، شیخ‌تپه، استادان، خیام، کاشانی، بهداری، امام) + Tehran, category pills, and view switcher.
- [x] **CP-03.3 — Leaflet Interactive Map**: Implemented `MarketplaceMap` with custom SVG Teal brand pins, count badges, Urmia/Tehran quick-recenter buttons, GPS locator, and bottom sheet merchant preview on pin tap.
- [x] **CP-03.4 — Search, Category & Radius Filtering**: Implemented `FilterModal` with radius options (500m to 25km), business type pills, and dietary preferences; debounced (300ms) search across titles, merchants, and categories.
- [x] **CP-03.5 — Surprise Bag & Flash Deal Detail Views**: Built `/listings/[id]` with guaranteed value floor, original vs discounted pricing in Toman, net savings banner, pickup window countdown, allergen declarations, and food safety clearance badge.
- [x] **CP-03.6 — Merchant Profile & Favorites System**: Applied migration `20260907000300_add_favorites_table`, built `/merchants/[id]` profile view with operating hours and active listings, plus `/api/merchants/[id]/favorite` dual-mode toggle endpoint.
- [x] **CP-03.7 — Discovery Tests & Validation**: 46/46 vitest tests passing across 7 suites (`tests/m03-discovery.test.ts`), Next.js production build exit code 0, 0 TypeScript errors, 0 ESLint warnings.

### Milestone M04 Checklist
- [x] **CP-04.1 — ReservationService & Atomic Inventory Locking**: Built 10-minute hold reservation service with atomic conditional update (`WHERE (total - reserved - sold) >= $quantity`), auto-release background sweep, and customer cancellation.
- [x] **CP-04.2 — Checkout Summary UI & Live 10-Min Countdown**: Built `/checkout/[reservationId]` with live countdown timer, order item summary, net customer savings indicator, gateway selector, and terms acceptance.
- [x] **CP-04.3 — IPaymentGateway Abstraction & Gateways**: Implemented `IPaymentGateway` interface, `MockPaymentGateway` (for dev and tests), and `ZarinpalGatewayAdapter` (for production IPG transactions).
- [x] **CP-04.4 — Server Payment Verification & Webhook Endpoint**: Built `/api/payments/verify` handling both browser redirects (with automated redirect to `/orders/[id]/receipt`) and headless webhook POST calls with authoritative server-side amount matching.
- [x] **CP-04.5 — OrderService State Machine**: Built human-readable order number generator (`LQ-XXXXX`), state transitions (`PENDING_PAYMENT` → `PAID` → `READY_FOR_PICKUP` → `COMPLETED` / `CANCELLED` / `REFUNDED`), and customer cumulative savings tracker.
- [x] **CP-04.6 — Double-Entry Financial Ledger Records**: Built `FinancialTransaction` accounting entries tracking gross customer payment (debit `CUSTOMER_PAYMENT`, credit `PLATFORM_CLEARING`), merchant payable (credit `MERCHANT_PAYABLE`), and 10% platform commission cut (credit `PLATFORM_COMMISSION`).
- [x] **CP-04.7 — Concurrency Stress Test Suite**: 53/53 tests passing across 8 suites (`tests/m04-orders-payments.test.ts`), verifying 20 simultaneous threads competing for the last 2 surplus bags: exactly 2 succeed, 18 rejected with zero overselling.

### M04 UI/UX & Design System Checkpoint Checklist
- [x] **CP-UI.1 — White + Deep Teal Design Tokens**: Centralized platform-neutral tokens in `@loqme/design-tokens` with CSS variable generator, semantic color aliases (`--color-primary`, `--color-primary-hover`, `--color-primary-soft`, `--color-background`, `--color-surface`, `--color-text`, `--color-border`), Emil Kowalski motion press curves, and shimmer animations in `globals.css`.
- [x] **CP-UI.2 — Reusable UI Primitives Suite**: Built and upgraded core UI primitives in `apps/web/src/components/ui/`: `Skeleton` + `CardSkeleton` (eliminates dramatic layout shifts), `Select` (custom RTL dropdown replacing browser defaults), `EmptyState` (purposeful iconography and action CTA), `ErrorState` (user-friendly error recovery), `Button` (5 variants with micro-press physics), `Input` (teal focus rings and RTL icon support), `Card`, and `Badge`.
- [x] **CP-UI.3 — Customer Shell & Header Navigation**: Built responsive `CustomerShell` featuring desktop top navigation with Deep Teal brand typography («لقمه - کشف هوشمند»), Urmia launch city indicator badge, mobile bottom nav with active pill indicators, and full Persian trust footer.
- [x] **CP-UI.4 — Discovery & Listing Surface Overhaul**: Redesigned `/` landing page and `/explore` marketplace into a high-density discovery experience with Urmia neighborhood selector, category carousels, explicit net customer savings callouts (`سود شما: XX,XXX تومان`), food safety clearance badges, and pickup window countdowns.
- [x] **CP-UI.5 — Checkout, Receipt & Orders Flow Polish**: Polished `/checkout/[reservationId]` with live 10-minute hold countdown timer, `/orders/[id]/receipt` with complete payment confirmation and pickup directions, and `/orders` with tabbed order history, skeleton loading, and empty states.
- [x] **CP-UI.6 — Accessibility, RTL & Cross-Viewport Validation**: Full accessibility pass (proper ARIA attributes, semantic landmarks, high contrast ratios, touch targets >= 44px). Validated RTL layout across Desktop (1280px), Tablet (768px), and Mobile (390px) via browser subagent recording (`design_system_inspection_1788728557320.webp`).
- [x] **CP-UI.7 — Authoritative Governance & Design System Docs**: Updated `docs/DESIGN_SYSTEM.md` with complete token tables and component usage; updated `AGENTS.md` with strict rules prohibiting browser-default UI and mandating production-quality UI across all milestones.
- [x] **CP-UI.8 — Design Template & Official Logo Alignment**: Integrated user's official sprout-glyph logo into SVG vector component `<LoqmeLogo />`, `favicon.ico`, `favicon.svg`, `icon.svg`, and `logo.png`. Applied full visual design system from the provided design template: Deep Teal (`#135E66`), Mint Green accent (`#65CF9B`), Warm Cream canvas (`#FAF7F5`), Dark Charcoal typography (`#222026`), full pill buttons (`rounded-full`), hero banner with branded bag photography, Deep Teal category navigation ribbon, warm mission statement card, 4-photo lifestyle showcase grid, and full Deep Teal branded trust footer. Production build exit code 0.

### Milestone M05 Checklist
- [x] **CP-05.1 — PickupService & Dynamic Cryptographic QR Tokens**: Implemented `PickupService` with HMAC-SHA256 rotating QR tokens (60-second client refresh, 180-second sliding validity window) and 4-digit CSPRNG numeric OTP generator (`apps/web/src/domain/pickup/pickup.service.ts`). Added `PickupVerification` database entity, indexes, and migration `20260910000000_pickup_verification`.
- [x] **CP-05.2 — Customer Pickup Credentials Screen**: Built interactive `CustomerPickupPassModal` with dynamic QR display, auto-refresh countdown circle, high-brightness contrast toggle, large 4-digit Persian OTP (`۸۴۹۱`) with copy button, store directions link (Google Maps), store contact, and celebration screen upon handoff completion («نوش جان! امیدواریم از لقمه‌تان لذت ببرید.»). Integrated directly into `/orders/[id]/receipt` and `/orders`.
- [x] **CP-05.3 — Merchant Live Pickup Queue**: Implemented `/api/merchant/pickup/queue` returning active orders ready for pickup with customer details, masked phone (`۰۹۱۲***۴۳۲۱`), order code, bag title, quantity, and pickup countdown.
- [x] **CP-05.4 — HTML5 QR Scanner & Web Audio Chime**: Built `QRCameraScanner` using native HTML5 camera stream with camera flip (rear/front), permission error fallback, and animated laser scan line; implemented Web Audio API synthesizer (`apps/web/src/lib/utils/audio.ts`) providing C-major arpeggio success chime and error buzzer with zero external assets. Upgraded `/merchant/orders` to a live queue dashboard with 4-digit keypad and instant verification actions.
- [x] **CP-05.5 — Atomic Verification Handshake & Double-Pickup Prevention**: Built `/api/pickup/verify` endpoint verifying merchant staff authorization (`canScanPickup: true` or owner), rate-limiting lockout (max 5 failed attempts locks verification for 15 minutes), and PostgreSQL atomic concurrency lock (`UPDATE "PickupVerification" SET isVerified = true WHERE orderId = $1 AND isVerified = false`). Subsequent scans return HTTP 409 Conflict with exact previous timestamp.
- [x] **CP-05.6 — No-Show Worker & Pickup Reminders**: Built automated sweeper `sweepNoShows()` transitioning uncollected orders past `pickupEnd` to `NO_SHOW` (`/api/pickup/no-show`), and automated 45-minute pickup reminder detection.
- [x] **CP-05.7 — Validation & Concurrency Stress Test Suite**: Cryptographic HMAC generation and 180s expiration unit tests passing (5/5 tests in `tests/m05-pickup.test.ts`); 5-thread simultaneous double-pickup concurrency test implemented; Next.js 14 production build exit code 0 across all 25 routes; TypeScript typecheck (`npx tsc --noEmit`) 0 errors; ESLint 0 errors.

### Milestone M06 Checklist
- [x] **CP-06.1 — ListingSafety State Machine & Checkout Lockdown**: Implemented automated checks preventing reservation hold or order checkout for any listing whose `safetyStatus` is not `APPROVED` (`apps/web/src/domain/reservation/reservation.service.ts` and `apps/web/src/domain/order/order.service.ts`). Added `Review`, `Complaint`, and `AuditLog` Prisma schema models and SQL migration `20260910010000_trust_safety_moderation`.
- [x] **CP-06.2 — Post-Pickup Verified Customer Review Loop**: Built `submitReview` and `replyToReview` in `ModerationService`, strictly restricted to buyers of verified `COMPLETED` orders with atomic merchant rating recalculation (`ratingAverage`, `ratingCount`). Built `/api/reviews` and `/api/reviews/[id]/reply`. Built `ReviewModal` with 3 category star ratings (Overall, Food Quality, Value-for-Money) and Persian comments. Displayed verified reviews and merchant replies on `/merchants/[id]`.
- [x] **CP-06.3 — Customer Complaint Filing & Food Safety Escalation Threshold**: Built `submitComplaint` in `ModerationService` and `/api/complaints`. Added multi-photo evidence uploader `/api/complaints/upload` (validates MIME types, max 5MB, UUID renaming). Implemented automated food safety threshold detection (if a merchant receives $\ge 2$ complaints for `EXPIRED_FOOD` or `SPOILED_FOOD` in 7 days, all their listings are automatically transitioned to `RESTRICTED` / `PAUSED` and an `AUTOMATED_SAFETY_LOCKOUT` audit entry is created).
- [x] **CP-06.4 — Admin Moderation Console & 1-Click Refund**: Built full admin moderation dashboard at `/admin/moderation` with critical food safety alert banners, complaint filtering by status, photo evidence lightbox preview, safety status override modal, and 1-click refund authorization (`/api/admin/complaints/[id]/resolve`).
- [x] **CP-06.5 — Refund Execution & Double-Entry Financial Ledger Reversal**: Extended `IPaymentGateway` and `PaymentService.refundPayment` to execute gateway refunds, settle `Refund` records (`SETTLED`), transition `Payment` and `Order` to `REFUNDED`, and write balanced double-entry accounting transactions debiting `MERCHANT_PAYABLE` (penalty) and crediting `PLATFORM_CLEARING`.
- [x] **CP-06.6 — Immutable Audit Logging Service**: Implemented `AuditService` and `/api/admin/audit` to record tamper-proof audit trails for all safety overrides, reviews, complaints, automated lockouts, and administrative refund decisions. Connected live audit log stream to `/admin/audit`.
- [x] **CP-06.7 — Validation & Test Suite**: Authored 15 tests in `tests/m06-trust-safety.test.ts` (15/15 passing in Vitest); Next.js 14 production build (`npm run build`) exit code 0 across 30 routes; TypeScript typecheck (`npx tsc --noEmit`) 0 errors; ESLint 0 errors.

---

## 5. Important Technical Decisions

1. **Multi-Client Monorepo (`apps/*` + `packages/*`)**: Standard npm workspaces without heavy tooling overhead; provides instant sharing of types, schemas, tokens, and API client.
2. **Native Mobile via React Native & Expo**: Explicitly rejected WebView wrapper in favor of native hardware capabilities, push notifications, and 60fps gesture performance (documented in `ADR-001`).
3. **Universal Dual-Mode Authentication**: Backend middleware and routes accept both `Authorization: Bearer <token>` (Mobile) and `loqme_session` HttpOnly cookie (Web).
4. **Backend Sole Authority**: Authoritative business rules, pricing, inventory locks, and financial ledger remain strictly on the backend.
5. **Platform-Neutral Design Tokens**: Single source of truth in `@loqme/design-tokens` exported as pure TypeScript objects with Web CSS custom property helper.
6. **PostGIS Native Spatial Indexing**: Stores coordinates in `MerchantLocation` with an automated trigger populating PostGIS `geography(Point, 4326)` and indexed using GIST (`idx_merchant_location_geom`) for high-performance sub-millisecond radius search.
7. **Database-Level Guardrails**: Enforced price validity (`discounted < original`), inventory integrity (`total >= reserved + sold`), and pickup window chronological validity directly in PostgreSQL via check constraints.
8. **Urmia-First Launch Strategy**: Initial commercial rollout, neighborhood density building, merchant onboarding, and operational learning starts in **Urmia (ارومیه)**, followed by expansion to Tehran.
9. **Interactive Leaflet Map with SSR Disabled**: Dynamic import with `ssr: false` avoids SSR `window` errors in Next.js App Router while rendering custom White + Teal markers with active bag counts.
10. **Atomic Conditional SQL Concurrency Defense**: Inventory reservation and purchase execution use single atomic updates checking `(totalQuantity - reservedQuantity - soldQuantity) >= $quantity` directly in PostgreSQL, completely eliminating race conditions without heavy distributed locks.
11. **Double-Entry Financial Ledger**: All monetary transfers record dual balanced entries (`CUSTOMER_PAYMENT`, `PLATFORM_CLEARING`, `MERCHANT_PAYABLE`, `PLATFORM_COMMISSION`) to provide an auditable accounting foundation.
12. **Automated Food Safety Circuit Breaker**: If $\ge 2$ food safety incidents (`EXPIRED_FOOD`, `SPOILED_FOOD`) are reported against a merchant within 7 days, all merchant listings are atomically flipped to `RESTRICTED` / `PAUSED`, halting new reservations until administrative health guild clearance.
13. **Dynamic HMAC-SHA256 Rotating QR Tokens**: Customer pickup passes rotate every 60 seconds with a sliding 180-second validation window, defeating static screenshots and unauthorized sharing while tolerating client-server clock drift.
14. **PostgreSQL Atomic Double-Pickup Defense**: Verification handshakes execute atomic conditional updates `UPDATE "PickupVerification" SET "isVerified" = true WHERE "orderId" = $1 AND "isVerified" = false`. Under concurrent scanning attempts, exactly 1 succeeds and all remaining requests receive count = 0, returning HTTP 409 Conflict with previous completion timestamp.
15. **Web Audio API Client-Side Synthesizer**: Implemented pure in-browser synthesized auditory feedback (C-major arpeggio chime and 180Hz buzzer) via Web Audio API oscillators, eliminating latency and external audio asset network dependencies.
16. **Verified Buyer Review Boundary**: Reviews cannot be fabricated or submitted arbitrarily; only authenticated buyers of completed orders can submit a review, strictly once per order.

---

## 6. Known Limitations & Future Blockers

| Area | Current State | Future Requirement |
| :--- | :--- | :--- |
| **Automated Bank Payouts** | Merchant payable balances tracked in financial ledger with debit penalty on refund; automated Paya/Satna bank transfers pending M08. | M08 scope: Admin platform and payout batching. |
| **Merchant Store Analytics** | Basic rating average and count tracked; deep analytics and bag forecasting pending M07/M09. | M07/M09 scope: Merchant product and marketplace analytics. |

---

## 7. Pending Decisions

1. **Primary SMS Provider**: Select between Kavenegar and FarazSMS for production OTP dispatch (`INotificationService`).
2. **Map Provider**: Confirm Leaflet tile provider (Neshan Map API vs OpenStreetMap).
3. **EAS Build Credentials**: Apple Developer Account and Google Play Console accounts for production mobile releases.

---

## 8. Latest Validation Results

* **Milestone M06 Test Suite**: 15/15 tests passing in `tests/m06-trust-safety.test.ts` (Zod validation, review loop, complaint threshold, 1-click refund, double-entry penalty, and audit trail).
* **TypeScript Typecheck**: `npm run typecheck` and `npx tsc --noEmit` exited with code 0 (zero errors across all packages and apps).
* **ESLint Validation**: `npm run lint` reported 0 errors.
* **Production Build**: `npm run build` completed successfully (exit code 0, 30 routes compiled and optimized including `/admin/moderation`, `/admin/audit`, `/api/reviews/*`, `/api/complaints/*`, and `/api/admin/*`).
* **Design System Conformance**: White + Teal (`#135E66`) tokens, Vazirmatn Persian typography, RTL layout (`dir="rtl"`), and production-quality UI across customer review modal, dispute modal, merchant review section, and admin moderation console.

