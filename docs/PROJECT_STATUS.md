# Living Project Status Tracker — Loqme (لقمه)

> **CRITICAL PROTOCOL**: This is a living operational document.  
> Future agents must inspect this file before undertaking any milestone work, and update it immediately upon completing checkpoints.  
> Do not rely on conversational memory. Never mark incomplete work as complete.

---

## 1. Project Health & Current State

| Metric | Status |
| :--- | :--- |
| **Current Milestone** | **M00 — Project Discovery & Architecture** |
| **Milestone Status** | `In Progress` |
| **Overall Completion** | `8%` (M00 Knowledge Base Initialization) |
| **Repository State** | Greenfield Initialization (`C:\Users\etraab\.gemini\antigravity-ide\scratch\loqme`) |
| **Last Updated** | 2026-09-05 (Knowledge Base Initialization) |

---

## 2. Technology Stack & Operational Environment

* **Runtime**: Node.js `v20.17.0` (Active on Windows host)
* **Package Manager**: `npm` `11.10.0` (via `npm.cmd` / `npx.cmd`)
* **Framework**: Next.js 14+ (App Router), React, TypeScript
* **Database**: PostgreSQL with PostGIS extension (target engine)
* **Styling**: Centralized Token Architecture, Vanilla CSS variables, Vazirmatn font, RTL-first
* **Version Control**: Git `2.46.0` initialized on `main` branch

---

## 3. Milestone Completion Summary

| Milestone | Title | Status | Completion % |
| :--- | :--- | :--- | :--- |
| **M00** | **Project Discovery & Architecture** | `In Progress` | `85%` |
| **M01** | Application Foundation | `Pending` | `0%` |
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

## 4. Current Milestone (M00) Checklist

- [x] **C0.1 — Repository Inspection**: Completed environmental inspection (Node v20, npm v11, PowerShell execution policies, empty greenfield workspace).
- [x] **C0.2 — Authoritative Governance Setup**: Authored authoritative `AGENTS.md` and `README.md`.
- [x] **C0.3 — Product & Behavioral Architecture**: Authored `PRODUCT.md`, `PRODUCT_PRINCIPLES.md`, `UX_PSYCHOLOGY.md`, and `BRAND.md`.
- [x] **C0.4 — System Design & Token Architecture**: Authored `DESIGN_SYSTEM.md` and `ARCHITECTURE.md`.
- [x] **C0.5 — Domain & Economic Modeling**: Authored `DATA_MODEL.md` and `BUSINESS_MODEL.md`.
- [x] **C0.6 — Safety, Security & Legal Registries**: Authored `SECURITY.md`, `FOOD_SAFETY.md`, and `LEGAL_ASSUMPTIONS.md`.
- [x] **C0.7 — Roadmap & Milestone Specifications**: Authored `ROADMAP.md` and all 12 individual milestone specification files (`M00` through `M11`).
- [ ] **C0.8 — Final Consistency Audit & M00 Sign-off**: Cross-check file paths, brand naming consistency, and confirm ready for M01 execution.

---

## 5. Important Technical Decisions

1. **Monolithic Next.js Architecture**: Decided on Next.js App Router (Server Components + Server Actions) rather than split frontend/backend services.
2. **No .NET Backend for MVP**: Confirmed that a separate .NET backend adds unnecessary operational overhead and complexity without delivering functional value for the MVP.
3. **PostGIS for Geo-Search**: Adopted PostgreSQL with PostGIS extension for high-performance spatial queries (`ST_DWithin`) rather than heavy external search engines.
4. **Token-First Design System**: Created a centralized CSS Custom Property token architecture so that the future developer-provided design scale can be injected seamlessly.
5. **Atomic Reservation Locking**: Enforced atomic database-level increment/decrement patterns to guarantee zero overselling under concurrent checkouts.

---

## 6. Known Risks & Mitigation Strategies

| Risk | Impact | Mitigation Plan |
| :--- | :--- | :--- |
| **PowerShell Script Execution Policy on Windows** | High (blocks `.ps1` binaries like `pnpm.ps1`) | Use `npm.cmd` / `npx.cmd` directly in PowerShell or execute through `cmd.exe /c`. |
| **Legal Status of Near-Date Food Sales** | High | Tracked under `LEG-05` in `LEGAL_ASSUMPTIONS.md`; engage Iranian commercial guild counsel before production launch. |
| **Payment Gateway E-Namad Requirement** | High | Abstract payment gateway behind `IPaymentGateway` interface; provide `MockPaymentGateway` for rapid offline dev and testing. |
| **Merchant Operation Non-Compliance (Store Closed during Pickup)** | Medium | 100% customer refund guarantee backed by merchant penalty balance adjustments. |

---

## 7. Pending Decisions

1. **ORM Selection**: Finalize between Prisma ORM vs Drizzle ORM in M01 (Prisma recommended for robust migration management and PostGIS compatibility).
2. **Primary SMS Provider**: Select between Kavenegar and FarazSMS for production OTP dispatch (both supported via `INotificationService` interface).
3. **Map Provider**: Confirm Leaflet tile provider (Neshan Map API vs OpenStreetMap).

---

## 8. Latest Validation Results

* **Environment Check**: Node.js `v20.17.0`, npm `11.10.0`, Git initialized.
* **Workspace Verification**: `C:\Users\etraab\.gemini\antigravity-ide\scratch\loqme` established as the repository root.
* **Documentation Suite**: All 15 core architectural documents generated and aligned with product specifications.
