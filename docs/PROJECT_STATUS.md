# Living Project Status Tracker — Loqme (لقمه)

> **CRITICAL PROTOCOL**: This is a living operational document.  
> Future agents must inspect this file before undertaking any milestone work, and update it immediately upon completing checkpoints.  
> Do not rely on conversational memory. Never mark incomplete work as complete.

---

## 1. Project Health & Current State

| Metric | Status |
| :--- | :--- |
| **Current Milestone** | **M02 — Core Domain & Database** |
| **Milestone Status** | `Ready for M02` (Post-M01 Mobile-Readiness Architecture Refactor Completed) |
| **Overall Completion** | `17%` (M00 100%, M01 100%, Post-M01 Refactor 100%) |
| **Repository State** | Monorepo Active (`apps/web`, `packages/*`, PostgreSQL 15 running) |
| **Last Updated** | 2026-09-06 (Post-M01 Mobile-Readiness Refactor Verified) |

---

## 2. Technology Stack & Operational Environment

* **Runtime**: Node.js `v20.17.0` (Active on Windows host)
* **Package Manager**: `npm` `11.10.0` (via `npm.cmd` / `npx.cmd`) with npm workspaces (`apps/*`, `packages/*`)
* **Monorepo Architecture**:
  * `apps/web`: Next.js 14.2.23 (App Router), React 18, TypeScript 5
  * `apps/mobile`: [Future] React Native / Expo Client
  * `packages/types`: `@loqme/types` (Domain contracts, RBAC, API wrappers)
  * `packages/validation`: `@loqme/validation` (Zod schemas, Iranian mobile & Persian utilities)
  * `packages/design-tokens`: `@loqme/design-tokens` (White + Teal palette, Emil Kowalski motion)
  * `packages/api`: `@loqme/api` (Universal fetch-based API client, Bearer & Cookie auth)
  * `packages/config`: `@loqme/config` (Shared tsconfig presets)
* **Database**: PostgreSQL 15 with PostGIS (Active via Docker container `loqme-postgres` on port 5432)
* **ORM & Migrations**: Prisma ORM `v5.22.0` with migration `0001_init_auth_users` applied
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
| **M02** | Core Domain & Database | `Pending` | `0%` |
| **M03** | Marketplace Discovery | `Pending` | `0%` |
| **M04** | Orders, Inventory & Payments | `Pending` | `0%` |
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

---

## 5. Important Technical Decisions

1. **Multi-Client Monorepo (`apps/*` + `packages/*`)**: Standard npm workspaces without heavy tooling overhead; provides instant sharing of types, schemas, tokens, and API client.
2. **Native Mobile via React Native & Expo**: Explicitly rejected WebView wrapper in favor of native hardware capabilities, push notifications, and 60fps gesture performance (documented in `ADR-001`).
3. **Universal Dual-Mode Authentication**: Backend middleware and routes accept both `Authorization: Bearer <token>` (Mobile) and `loqme_session` HttpOnly cookie (Web).
4. **Backend Sole Authority**: Authoritative business rules, pricing, inventory locks, and financial ledger remain strictly on the backend.
5. **Platform-Neutral Design Tokens**: Single source of truth in `@loqme/design-tokens` exported as pure TypeScript objects with Web CSS custom property helper.

---

## 6. Known Limitations & Future Mobile Blockers

| Area | Current State | Future Mobile Requirement |
| :--- | :--- | :--- |
| **Marketplace Listings** | Not yet modeled in database (M02 scope). | Required before mobile discovery screens can be built. |
| **Geospatial PostGIS Queries** | PostgreSQL PostGIS active; endpoints pending M03. | Required for mobile nearby radius queries (`ST_DWithin`). |
| **Payment Gateway Deep Links** | Payment domain pending M04. | Deep link scheme (`loqme://payment-callback`) required for mobile IPG return. |
| **Native Push Notifications** | Mock console notifications only. | Expo Push Notification / APNs credentials required in M-Mobile-06. |

---

## 7. Pending Decisions

1. **Primary SMS Provider**: Select between Kavenegar and FarazSMS for production OTP dispatch (`INotificationService`).
2. **Map Provider**: Confirm Leaflet tile provider (Neshan Map API vs OpenStreetMap).
3. **EAS Build Credentials**: Apple Developer Account and Google Play Console accounts for production mobile releases.

---

## 8. Latest Validation Results

* **Unit Test Suite**: 25 tests passing across 5 test suites in 1.49s (`tests/auth.test.ts`, `tests/rbac.test.ts`, `tests/persian.test.ts`, `tests/session.test.ts`, `tests/shared-packages.test.ts`).
* **TypeScript Typecheck**: `npx tsc --noEmit` exited with code 0 (zero errors).
* **ESLint Validation**: `npm run lint` reported 0 errors and 0 warnings.
* **Production Build**: `npm run build` completed successfully (exit code 0, 17 static pages and dynamic routes compiled and optimized).
* **Database & Migrations**: PostgreSQL 15 with PostGIS active, Prisma migration `0001_init_auth_users` applied.
