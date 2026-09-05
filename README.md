# Loqme (لقمه) — Surplus Food & Inventory Marketplace

> **خوب بخور، کمتر خرج کن.**  
> *Eat well, spend less.*

Official Domain: **[loqme.shop](https://loqme.shop)**  
Persian Brand: **لقمه**  
Official Latin Spelling: **Loqme**  

---

## 1. About Loqme

**Loqme** is a Persian-first, hyper-local marketplace connecting consumers with local bakeries, cafes, supermarkets, and restaurants to discover and purchase high-quality, legally sellable surplus or time-sensitive food inventory at attractive discounts (typically 40%–70% off retail value).

Customers save money and experience the joy of discovery through **Surprise Bags (بسته‌های شگفت‌انگیز)** and **Flash Deals (پیشنهادهای ویژه)**, while local merchants turn surplus inventory into immediate revenue and acquire new neighborhood patrons.

---

## 2. Source of Truth & Governance

> [!IMPORTANT]
> **This repository is the single source of truth.**  
> We do not rely on conversational memory or external assumptions. Every contributor and AI agent must read:
> 1. [AGENTS.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/AGENTS.md) — Authoritative governance, product psychology, safety & security rules.
> 2. [docs/PROJECT_STATUS.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/PROJECT_STATUS.md) — Real-time progress, active milestone checkpoints, and open risks.

---

## 3. Technology Stack

* **Frontend**: Next.js 14+ (App Router), React 18/19, TypeScript
* **Styling**: Centralized Token Architecture, Vanilla CSS / CSS Variables, Vazirmatn Typography, RTL-first
* **Backend**: Next.js Server Components, Server Actions & Route Handlers, Domain Service Layer
* **Database**: PostgreSQL with PostGIS extension (geospatial distance and radius queries)
* **Integrations**:
  * SMS / OTP Abstraction (Kavenegar / FarazSMS)
  * Payment Gateway Abstraction (Saman, Zarinpal, Sadad)
  * Map & Geocoding Abstraction (Neshan, Cedarmaps)
  * Object Storage Abstraction (S3-compatible: ArvanCloud / Liara)

---

## 4. Documentation Index

Comprehensive documentation is maintained in the `docs/` directory:

| Document | Description |
| :--- | :--- |
| [PRODUCT.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/PRODUCT.md) | Product vision, target personas, listing types, user flows & MVP scope |
| [PRODUCT_PRINCIPLES.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/PRODUCT_PRINCIPLES.md) | The 15 permanent non-negotiable product principles |
| [UX_PSYCHOLOGY.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/UX_PSYCHOLOGY.md) | Behavioral drivers, cognitive framing, habit formation & prohibited antipatterns |
| [BRAND.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/BRAND.md) | Tone of voice, brand identity, color rationale & typographic rules |
| [DESIGN_SYSTEM.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/DESIGN_SYSTEM.md) | Design tokens (color, space, elevation, radius), RTL rules & accessibility |
| [ARCHITECTURE.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/ARCHITECTURE.md) | System architecture, domain service boundaries & integration adapters |
| [DATA_MODEL.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/DATA_MODEL.md) | Conceptual domain entities, relationships, constraints & state machines |
| [BUSINESS_MODEL.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/BUSINESS_MODEL.md) | Commission structure, unit economics & marketplace flywheel |
| [SECURITY.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/SECURITY.md) | RBAC, payment verification, inventory concurrency & audit logging |
| [FOOD_SAFETY.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/FOOD_SAFETY.md) | Food safety policies, safetyStatus states & merchant obligations |
| [LEGAL_ASSUMPTIONS.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/LEGAL_ASSUMPTIONS.md) | Legal assumption registry, E-commerce regulations & guild compliance |
| [ROADMAP.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/ROADMAP.md) | Milestones M00 through M11 breakdown and dependencies |
| [PROJECT_STATUS.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/PROJECT_STATUS.md) | Living project status, active milestones, checkpoints & risks |

---

## 5. Development Roadmap Milestones

Milestones are tracked sequentially in `docs/milestones/`:

* **[M00 — Project Discovery & Architecture](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M00-project-discovery.md)** (Current)
* **[M01 — Application Foundation](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M01-foundation.md)**
* **[M02 — Core Domain & Database](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M02-domain-database.md)**
* **[M03 — Marketplace Discovery](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M03-marketplace.md)**
* **[M04 — Orders, Inventory & Payments](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M04-orders-payments.md)**
* **[M05 — Pickup Verification](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M05-pickup.md)**
* **[M06 — Trust, Safety & Moderation](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M06-trust-safety.md)**
* **[M07 — Merchant Product](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M07-merchant.md)**
* **[M08 — Admin Platform](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M08-admin.md)**
* **[M09 — Marketplace Analytics](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M09-analytics.md)**
* **[M10 — UX, SEO, PWA & Performance](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M10-polish.md)**
* **[M11 — Production Readiness](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M11-production.md)**

---

## 6. Development Workflow & Rules

1. **Never implement code without reviewing current milestone scope.**
2. **Never mark incomplete work as complete.**
3. **Persian-First & RTL**: Every UI view must render naturally in right-to-left with Persian numerals and Toman pricing.
4. **Zero Tolerance for Fake Urgency**: Do not inject artificial countdowns or fabricated viewer counters.
