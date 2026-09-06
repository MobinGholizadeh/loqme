# Living Project Status Tracker — Loqme (لقمه)

> **CRITICAL PROTOCOL**: This is a living operational document.  
> Future agents must inspect this file before undertaking any milestone work, and update it immediately upon completing checkpoints.  
> Do not rely on conversational memory. Never mark incomplete work as complete.

---

## 1. Project Health & Current State

| Metric | Status |
| :--- | :--- |
| **Current Milestone** | **M05 — Pickup Verification** |
| **Milestone Status** | `Ready for M05` (Milestone M04 Orders, Inventory & Payments Completed) |
| **Overall Completion** | `41%` (M00 100%, M01 100%, Post-M01 Refactor 100%, M02 100%, M03 100%, M04 100%) |
| **Repository State** | Monorepo Active (`apps/web`, `packages/*`, PostgreSQL 15 + PostGIS 3.4 running) |
| **Last Updated** | 2026-09-07 (Milestone M04 Orders, Inventory & Payments Completed & Verified) |

---

## 2. Technology Stack & Operational Environment

* **Runtime**: Node.js `v20.17.0` (Active on Windows host)
* **Package Manager**: `npm` `11.10.0` (via `npm.cmd` / `npx.cmd`) with npm workspaces (`apps/*`, `packages/*`)
* **Monorepo Architecture**:
  * `apps/web`: Next.js 14.2.23 (App Router), React 18, TypeScript 5, Leaflet 1.9
  * `apps/mobile`: [Future] React Native / Expo Client
  * `packages/types`: `@loqme/types` (Domain contracts, RBAC, API wrappers, Marketplace, Orders, Payments, Financial Transactions)
  * `packages/validation`: `@loqme/validation` (Zod schemas, Iranian mobile, Checkout & Reservation schemas)
  * `packages/design-tokens`: `@loqme/design-tokens` (White + Teal palette, Emil Kowalski motion)
  * `packages/api`: `@loqme/api` (Universal fetch-based API client, Bearer & Cookie auth)
  * `packages/config`: `@loqme/config` (Shared tsconfig presets)
* **Database**: PostgreSQL 15 with PostGIS 3.4 (Active via Docker container `loqme-postgres` on port 5432)
* **ORM & Migrations**: Prisma ORM `v5.22.0` with migrations:
  * `0001_init_auth_users`
  * `20260906201522_core_domain_entities`
  * `20260907000300_add_favorites_table`
  * `20260907001800_orders_payments_ledger` (Reservation, Order, Payment, FinancialTransaction, Refund)
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
| **M05** | Pickup Verification | `Pending` | `0%` |
| **M06** | Trust, Safety & Moderation | `Pending` | `0%` |
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

---

## 6. Known Limitations & Future Blockers

| Area | Current State | Future Requirement |
| :--- | :--- | :--- |
| **Pickup Verification Flow** | Orders transition to `READY_FOR_PICKUP` upon payment; QR code and merchant scan pending M05. | M05 scope: Merchant QR scanner and OTP verification handshake. |
| **Customer Dispute & Refund UI** | Programmatic `refundPayment` domain abstraction implemented; customer dispute UI pending M06. | M06 scope: Trust, safety and dispute resolution. |
| **Automated Bank Payouts** | Merchant payable balances tracked in financial ledger; automated Paya/Satna bank transfers pending M08. | M08 scope: Admin platform and payout batching. |

---

## 7. Pending Decisions

1. **Primary SMS Provider**: Select between Kavenegar and FarazSMS for production OTP dispatch (`INotificationService`).
2. **Map Provider**: Confirm Leaflet tile provider (Neshan Map API vs OpenStreetMap).
3. **EAS Build Credentials**: Apple Developer Account and Google Play Console accounts for production mobile releases.

---

## 8. Latest Validation Results

* **Unit & Integration Test Suite**: 53 tests passing across 8 test suites (`tests/auth.test.ts`, `tests/rbac.test.ts`, `tests/persian.test.ts`, `tests/session.test.ts`, `tests/shared-packages.test.ts`, `tests/m02-domain.test.ts`, `tests/m03-discovery.test.ts`, `tests/m04-orders-payments.test.ts`).
* **TypeScript Typecheck**: `npm run typecheck` and `npx tsc --noEmit` exited with code 0 (zero errors across all packages and apps).
* **ESLint Validation**: `npm run lint` reported 0 errors and 0 warnings.
* **Production Build**: `npm run build` completed successfully (exit code 0, 17 routes compiled and optimized).
* **Database & Migrations**: PostgreSQL 15 with PostGIS 3.4 active, Prisma migrations `0001_init_auth_users`, `20260906201522_core_domain_entities`, `20260907000300_add_favorites_table`, and `20260907001800_orders_payments_ledger` applied.
* **Concurrency Stress Test**: 20 concurrent threads attempting to purchase the last 2 surplus bags: exactly 2 succeeded, 18 failed with stock-out, zero overselling.
* **End-to-End Browser Flow**: Complete flow from `/listings/[id]` → reserve hold → `/checkout/[reservationId]` → simulated payment → `/orders/[id]/receipt` (Order `LQ-48945`) → `/orders` successfully executed and verified.
