# Living Project Status Tracker — Loqme (لقمه)

> **CRITICAL PROTOCOL**: This is a living operational document.  
> Future agents must inspect this file before undertaking any milestone work, and update it immediately upon completing checkpoints.  
> Do not rely on conversational memory. Never mark incomplete work as complete.

---

## 1. Project Health & Current State

| Metric | Status |
| :--- | :--- |
| **Current Milestone** | **M02 — Core Domain & Database** |
| **Milestone Status** | `Ready for M02` |
| **Overall Completion** | `16%` (M00 100%, M01 100%) |
| **Repository State** | Foundation Running (`C:\Users\etraab\.gemini\antigravity-ide\scratch\loqme`) |
| **Last Updated** | 2026-09-06 (M01 Application Foundation Completed) |

---

## 2. Technology Stack & Operational Environment

* **Runtime**: Node.js `v20.17.0` (Active on Windows host)
* **Package Manager**: `npm` `11.10.0` (via `npm.cmd` / `npx.cmd`)
* **Framework**: Next.js 14.2.23 (App Router), React 18, TypeScript 5
* **Database**: PostgreSQL 15 (Active via Docker container `loqme-postgres` on port 5432)
* **ORM & Migrations**: Prisma ORM `v5.22.0` with migration `0001_init_auth_users` applied
* **Security & Auth**: Iranian phone-first OTP (CSPRNG, 2-min expiry), `jose` signed HttpOnly session cookies, RBAC middleware
* **Styling**: Centralized Token Architecture, CSS variables, Vazirmatn font, RTL-first (`dir="rtl"`), Emil Kowalski craft tokens
* **Version Control**: Git initialized on `master` branch

---

## 3. Milestone Completion Summary

| Milestone | Title | Status | Completion % |
| :--- | :--- | :--- | :--- |
| **M00** | **Project Discovery & Architecture** | `Completed` | `100%` |
| **M01** | **Application Foundation** | `Completed` | `100%` |
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

---

## 5. Important Technical Decisions

1. **Monolithic Next.js Architecture**: Next.js App Router (Server Components + Route Handlers) with strict domain service separation.
2. **Prisma ORM on PostgreSQL 15**: Adopted Prisma ORM with connection pooling and automated migration scripts (`0001_init_auth_users`).
3. **Edge-Compatible JWT Session Token**: Implemented `jose` HS256 signed session cookies for instant RBAC evaluation in Next.js middleware.
4. **Token-First Design System**: Full CSS Custom Property palette matching `DESIGN_SYSTEM.md` and Emil Kowalski design engineering micro-interactions (`:active scale(0.97)`, custom curves).
5. **Console Mock SMS Dispatcher**: In-memory and global OTP persistence for rapid developer testing without external vendor fees.

---

## 6. Known Risks & Mitigation Strategies

| Risk | Impact | Mitigation Plan |
| :--- | :--- | :--- |
| **PowerShell Script Execution Policy on Windows** | High | Use `npm.cmd` / `npx.cmd` directly in PowerShell. |
| **Payment Gateway E-Namad Requirement** | High | Abstract payment gateway behind `IPaymentGateway` interface; provide `MockPaymentGateway`. |
| **Local Port Conflicts (5432)** | Low | Managed via Docker Compose container `loqme-postgres`. |

---

## 7. Pending Decisions

1. **Primary SMS Provider**: Select between Kavenegar and FarazSMS for production OTP dispatch (`INotificationService`).
2. **Map Provider**: Confirm Leaflet tile provider (Neshan Map API vs OpenStreetMap).

---

## 8. Latest Validation Results

* **Unit Test Suite**: 18 tests passing across 4 test suites in 1.29s (`tests/auth.test.ts`, `tests/rbac.test.ts`, `tests/persian.test.ts`, `tests/session.test.ts`).
* **Production Build**: `npm run build` completed successfully (exit code 0, 17 static pages and dynamic routes optimized).
* **ESLint Validation**: `npm run lint` reported 0 errors and 0 warnings.
* **Database & Migrations**: PostgreSQL 15 running in Docker, Prisma migration `0001_init_auth_users` applied, demo seed data populated.
* **Server Health**: Dev server running on `http://localhost:3000` with live OTP authentication and RBAC redirects.
