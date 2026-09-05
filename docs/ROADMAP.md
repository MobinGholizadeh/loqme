# Product & Engineering Roadmap — Loqme (لقمه)

> **Development Philosophy**: Strict milestone progression. Each milestone builds sequentially on validated foundational layers.  
> Work on any milestone begins only after dependencies are satisfied and verified against test suites.

---

## 1. Roadmap Milestone Matrix

```
[M00: Discovery & Architecture] (In Progress)
             │
             ▼
[M01: Application Foundation] (Next.js, DB, Auth, RTL, Tokens)
             │
             ▼
[M02: Core Domain & Database] (Listings, Inventory, Categories, Seed)
             │
             ▼
[M03: Marketplace Discovery] (Map, Nearby, Search, Bag Details)
             │
             ▼
[M04: Orders, Inventory & Payments] (Atomic Locks, Gateway, State Machine)
             │
             ▼
[M05: Pickup Verification] (Dynamic QR, OTP, Merchant Scanner)
             │
             ▼
[M06: Trust, Safety & Moderation] (Hygiene Rules, Reviews, Complaints)
             │
             ▼
[M07: Merchant Product] (Dashboard, Active Orders, Fast Publish)
             │
             ▼
[M08: Admin Platform] (Merchant Approval, Settlements, Disputes)
             │
             ▼
[M09: Marketplace Analytics] (Real GMV, Sell-Through, Density)
             │
             ▼
[M10: UX, SEO, PWA & Performance] (PWA, Schema.org, Polish)
             │
             ▼
[M11: Production Readiness] (Security Review, Deployment, Disaster Recovery)
```

---

## 2. Detailed Milestone Specifications

### M00 — Project Discovery & Architecture
* **Objective**: Inspect repository, establish architectural decisions, create comprehensive governance documentation, design token structure, and establish source-of-truth status tracking.
* **Dependencies**: None.
* **Scope**: Repository inspection, Next.js/Postgres decision, design-token foundation, routing plan, environment plan, documentation suite (`docs/*`), milestone specifications (`docs/milestones/*`), `PROJECT_STATUS.md`.
* **Out of Scope**: Core product code implementation, mock screens, database migrations, payment logic.
* **Acceptance Criteria**: Repository fully understood, architecture documented, knowledge base complete, `PROJECT_STATUS.md` initialized.
* **Status**: `In Progress`

### M01 — Application Foundation
* **Objective**: Scaffold Next.js application, configure TypeScript, establish database connectivity, migrations, SMS/OTP authentication, role-based access control, Persian RTL layouts, design tokens, and base UI components.
* **Dependencies**: M00.
* **Scope**: Next.js App Router, PostgreSQL connection pool, Prisma/Drizzle setup, initial migrations, OTP auth flow, RBAC middleware (`CUSTOMER`, `MERCHANT_STAFF`, `MERCHANT_OWNER`, `ADMIN`), RTL typography (Vazirmatn), base shells for Customer, Merchant, Admin.
* **Out of Scope**: Marketplace listings, payment gateway, pickup verification.
* **Acceptance Criteria**: Customer, Merchant, and Admin layout shells render; OTP auth works; RTL functions properly; TypeScript build passes cleanly.
* **Status**: `Pending`

### M02 — Core Domain & Database
* **Objective**: Model and persist core business entities: Merchants, Categories, Listings (Surprise Bags & Flash Deals), Inventory, Locations, Operating Hours, and Safety metadata with seed data.
* **Dependencies**: M01.
* **Scope**: Prisma schemas, migrations, domain services, spatial indexes (PostGIS), seed scripts with realistic Tehran merchants, categories, and test listings.
* **Out of Scope**: Public search/map UI, checkout, payment integration.
* **Acceptance Criteria**: Merchant can persist and update listings in development; inventory records accurately reflect quantities; database constraints enforce data integrity.
* **Status**: `Pending`

### M03 — Marketplace Discovery
* **Objective**: Implement hyper-local discovery, allowing consumers to find nearby surplus listings via interactive maps, categories, search, and detailed Surprise Bag views.
* **Dependencies**: M02.
* **Scope**: Discovery homepage, PostGIS geospatial radius query, Leaflet/Map view, category filtering, search input, listing detail view (Surprise Bag & Flash Deal), store profile, favorite toggling.
* **Out of Scope**: Checkout, payment, order creation.
* **Acceptance Criteria**: Customer can browse listings within 1km–10km; filter by category; open listing details with full Persian pricing and pickup times.
* **Status**: `Pending`

### M04 — Orders, Inventory & Payments
* **Objective**: Build atomic reservation locking, checkout flow, payment gateway integration (with mock & real adapter support), order state machine, and financial transaction ledger.
* **Dependencies**: M03.
* **Scope**: 10-minute atomic reservation hold, concurrency handling (prevent overselling), checkout review, Iranian payment gateway abstraction (Zarinpal/Saman), callback verification, Order lifecycle state machine.
* **Out of Scope**: In-person pickup scanning, merchant payout disbursement.
* **Acceptance Criteria**: Multiple concurrent requests cannot oversell stock; payment callbacks verify correctly; order transitions accurately through state machine.
* **Status**: `Pending`

### M05 — Pickup Verification
* **Objective**: Facilitate seamless, secure in-person handoff between customer and merchant using dynamic time-hashed QR codes and fallback 4-digit OTPs.
* **Dependencies**: M04.
* **Scope**: Customer pickup credentials screen (dynamic QR + OTP), merchant pickup verification screen/camera scanner, atomic redemption handshake, double-pickup prevention, pickup reminder notifications.
* **Out of Scope**: Merchant analytics, dispute arbitration.
* **Acceptance Criteria**: Merchant scans QR or enters OTP; order atomically transitions to `COMPLETED`; double-redemption fails; customer receives confirmation.
* **Status**: `Pending`

### M06 — Trust, Safety & Moderation
* **Objective**: Implement merchant verification, listing safety state machines, customer review loops, and dispute/complaint resolution systems.
* **Dependencies**: M05.
* **Scope**: Listing `safetyStatus` transitions (`PENDING_REVIEW`, `APPROVED`, `RESTRICTED`, `UNSAFE`), customer review submission after verified pickup, complaint filing with image evidence, admin moderation queue, automated refund triggers.
* **Out of Scope**: Advanced analytics dashboards.
* **Acceptance Criteria**: Unsafe listings are blocked from checkout; verified reviews display on merchant profiles; complaints trigger admin dispute resolution.
* **Status**: `Pending`

### M07 — Merchant Product
* **Objective**: Provide a comprehensive merchant portal allowing business owners and staff to manage daily surplus drops, track live pickup queues, and view operational metrics.
* **Dependencies**: M06.
* **Scope**: Merchant dashboard overview, fast listing creator (under 60s), live order pickup queue, business profile & location editor, operating hours & pickup window manager, staff role assignment.
* **Out of Scope**: Cross-merchant global platform administration.
* **Acceptance Criteria**: Merchant can operate daily listing creation and pickup handoffs independently without manual support.
* **Status**: `Pending`

### M08 — Admin Platform
* **Objective**: Deliver a unified central administration back-office for marketplace operators to supervise merchants, categories, financial reconciliations, and platform safety.
* **Dependencies**: M07.
* **Scope**: Admin dashboard, merchant verification queue, customer management, catalog & category manager, commission rule engine, refund approvals, immutable audit log inspector.
* **Out of Scope**: Marketing automation.
* **Acceptance Criteria**: Platform admin can approve new merchants, audit disputes, issue refunds, and adjust commission rates.
* **Status**: `Pending`

### M09 — Marketplace Analytics
* **Objective**: Calculate and display genuine marketplace health metrics derived strictly from live operational and financial database records.
* **Dependencies**: M08.
* **Scope**: Real GMV calculation, net platform commission, Average Order Value (AOV), sell-through rates, pickup completion rates, merchant retention cohorts, geographic density heatmaps.
* **Out of Scope**: Fabricated vanity statistics.
* **Acceptance Criteria**: All analytical metrics derive from verified database ledger entries with zero fabricated numbers.
* **Status**: `Pending`

### M10 — UX, SEO, PWA & Performance
* **Objective**: Elevate the platform to consumer-grade visual elegance, mobile PWA responsiveness, comprehensive Persian SEO, and sub-second load times.
* **Dependencies**: M09.
* **Scope**: PWA installability & offline caching, JSON-LD Schema (`LocalBusiness`, `Product`), Open Graph tags, Persian XML sitemap, mobile touch polish, micro-animations, Lighthouse score optimization (90+).
* **Out of Scope**: Major architectural rewrites.
* **Acceptance Criteria**: PWA installs cleanly on Android/iOS; Lighthouse performance score ≥ 90; structured data validates on Google Rich Results.
* **Status**: `Pending`

### M11 — Production Readiness
* **Objective**: Comprehensive security review, stress testing, database backup automation, disaster recovery plans, and production deployment configuration.
* **Dependencies**: M10.
* **Scope**: Penetration testing review, payment gateway failover test, rate-limiting stress test, multi-stage Docker containerization, PM2/process supervision, database backup strategy, monitoring & logging alerts.
* **Out of Scope**: None (final deployment milestone).
* **Acceptance Criteria**: Production readiness checklist passes 100%; zero critical security vulnerabilities; automated deployment verified.
* **Status**: `Pending`
