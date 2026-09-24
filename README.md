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
> 1. [AGENTS.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/AGENTS.md) — Authoritative governance, multi-client protocol, safety & security rules.
> 2. [docs/PROJECT_STATUS.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/PROJECT_STATUS.md) — Real-time progress, active milestone checkpoints, and open risks.
> 3. [docs/MOBILE_ARCHITECTURE.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/MOBILE_ARCHITECTURE.md) — Multi-client architecture and native mobile guidelines.

---

## 3. Quickstart: Running Locally

Follow these steps to run the complete Loqme platform on your local development machine.

### Prerequisites
* **Node.js**: `v20.0.0` or higher (tested on `v20.17.0`)
* **npm**: `v10.0.0` or higher (tested on `v11.10.0`)
* **Docker & Docker Compose**: For running PostgreSQL 15 with PostGIS
* **Git**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/MobinGholizadeh/loqme.git
cd loqme
```

---

### Step 2: Configure Environment Variables
Copy the example environment configuration:
```bash
# On Linux/macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

The default `.env` is pre-configured for local Docker development:

`npm run dev` loads this repository-root `.env` for the web app as well as Prisma/Docker. Environment variables provided by the shell or Doppler take precedence. Use the root command so app-local configuration does not leave provider keys behind.

* `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5432/loqme?schema=public`
* `SESSION_SECRET`: Default 32+ character development secret
* `SMS_PROVIDER`: `console` (prints verification codes to the console without sending actual SMS)

---

### Step 3: Start the PostgreSQL Database
Start PostgreSQL 15 with the PostGIS extension using Docker Compose:
```bash
docker compose up -d
```

Verify that the container is healthy:
```bash
docker ps --filter "name=loqme-postgres"
```

---

### Step 4: Install Dependencies
Install all workspace dependencies:
```bash
npm install
```

---

### Step 5: Run Database Migrations & Seed Data
Initialize database schema and populate initial test accounts:
```bash
# Apply Prisma migrations
npm run db:migrate

# Seed demo users (Customer, Merchant, Admin)
npm run db:seed
```

---

### Step 6: Start the Development Server
```bash
npm run dev
```

The application will start on **[http://localhost:3000](http://localhost:3000)**.

---

## 4. Test Accounts & Authentication

Loqme uses Iranian phone-first OTP authentication. When running locally with `SMS_PROVIDER="console"`, the 5-digit OTP is automatically printed to your terminal.

| Role | Mobile Number | Destination | Description |
| :--- | :--- | :--- | :--- |
| **Customer** | `09121111111` | `/explore` | Consumer discovery shell, order history, profile |
| **Merchant** | `09122222222` | `/merchant` | Merchant dashboard, inventory drops, active pickup queue |
| **Admin** | `09123333333` | `/admin` | Central administration, dispute moderation, audit trail |

> **Developer Convenience**: In local development, the login form will automatically fetch and display the dev OTP directly in the UI for instant testing.

---

## 5. Development Commands

Run these commands from the repository root:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on `http://localhost:3000` |
| `npm run build` | Builds the production bundle for the web application |
| `npm test` | Runs the Vitest unit and integration test suites |
| `npm run lint` | Runs ESLint across all workspaces |
| `npm run typecheck` | Typechecks all workspace packages with `tsc --noEmit` |
| `npm run db:migrate` | Runs Prisma migrations in development mode (`prisma migrate dev`) |
| `npm run db:seed` | Seeds the database with test users (`tsx prisma/seed.ts`) |
| `npm run db:push` | Pushes schema changes directly without creating migration files |

---

## 6. Monorepo Repository Structure

The project is structured as an npm workspace monorepo separating web and shared contracts:

```text
loqme/
├── apps/
│   ├── web/                          # Next.js 14 App Router Web Application (@loqme/web)
│   └── mobile/                       # [Planned - M-Mobile-01] React Native / Expo Native Client
│
├── packages/
│   ├── api/                          # Universal fetch-based API client (@loqme/api)
│   ├── types/                        # Pure domain contracts & RBAC types (@loqme/types)
│   ├── validation/                   # Universal Zod schemas & Persian utilities (@loqme/validation)
│   ├── design-tokens/                # Platform-neutral White + Teal palette & motion (@loqme/design-tokens)
│   └── config/                       # Shared tsconfig presets (@loqme/config)
│
├── prisma/                           # Authoritative PostgreSQL schema & migrations
├── tests/                            # Vitest unit and integration test suites
├── docs/                             # Authoritative architectural documentation & milestones
├── AGENTS.md                         # Authoritative multi-client governance protocol
└── package.json                      # Root workspace orchestrator
```

---

## 7. Technology Stack

* **Web Framework**: Next.js 14.2.23 (App Router), React 18, TypeScript 5
* **Future Mobile**: React Native / Expo (consuming shared `packages/*`)
* **Styling**: Centralized Token Architecture, Vanilla CSS variables, Vazirmatn Typography, RTL-first (`dir="rtl"`)
* **Visual Identity**: White + Teal / Dark Turquoise (`#0F766E`, `#115E59`, `#0D9488`) / سبز کله‌غازی
* **Database**: PostgreSQL 15 with PostGIS (Docker Compose)
* **ORM**: Prisma ORM `v5.22.0`
* **Authentication**: Iranian phone-first OTP (CSPRNG, 2-min expiry), `jose` signed JWT via either `Authorization: Bearer <token>` or HttpOnly cookie

---

## 8. Documentation Index

Comprehensive documentation is maintained in the `docs/` directory:

| Document | Description |
| :--- | :--- |
| [PRODUCT.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/PRODUCT.md) | Product vision, target personas, listing types, user flows & MVP scope |
| [PRODUCT_PRINCIPLES.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/PRODUCT_PRINCIPLES.md) | The 15 permanent non-negotiable product principles |
| [UX_PSYCHOLOGY.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/UX_PSYCHOLOGY.md) | Behavioral drivers, cognitive framing, habit formation & anti-manipulation |
| [BRAND.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/BRAND.md) | Tone of voice, brand identity, White + Teal color rationale & typography |
| [DESIGN_SYSTEM.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/DESIGN_SYSTEM.md) | Design tokens, RTL layout rules, Emil Kowalski craft motion tokens |
| [ARCHITECTURE.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/ARCHITECTURE.md) | System architecture, domain service boundaries & integration adapters |
| [MOBILE_ARCHITECTURE.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/MOBILE_ARCHITECTURE.md) | Multi-client architecture, native Expo blueprint, shared contracts matrix |
| [ADR-001](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/decisions/ADR-001-mobile-architecture.md) | Architecture Decision Record: Native React Native/Expo vs WebView rejection |
| [DATA_MODEL.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/DATA_MODEL.md) | Conceptual domain entities, relationships, constraints & state machines |
| [BUSINESS_MODEL.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/BUSINESS_MODEL.md) | Commission structure, unit economics & marketplace flywheel |
| [SECURITY.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/SECURITY.md) | RBAC, payment verification, inventory concurrency & audit logging |
| [FOOD_SAFETY.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/FOOD_SAFETY.md) | Food safety policies, safetyStatus states & merchant obligations |
| [LEGAL_ASSUMPTIONS.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/LEGAL_ASSUMPTIONS.md) | Legal assumption registry, E-commerce regulations & guild compliance |
| [ROADMAP.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/ROADMAP.md) | Milestones M00 through M11 breakdown and future mobile roadmap |
| [PROJECT_STATUS.md](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/PROJECT_STATUS.md) | Living project status, active milestones, checkpoints & risks |

---

## 9. Development Roadmap Milestones

* **[M00 — Project Discovery & Architecture](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M00-project-discovery.md)** (`Completed`)
* **[M01 — Application Foundation](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M01-foundation.md)** (`Completed`)
* **Post-M01 Mobile-Readiness Refactor** (`Completed`)
* **[M02 — Core Domain & Database](file:///C:/Users/etraab/.gemini/antigravity-ide/scratch/loqme/docs/milestones/M02-domain-database.md)** (`Ready`)
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

## 10. Development Workflow & Rules

1. **Never implement code without reviewing current milestone scope.**
2. **Never mark incomplete work as complete.**
3. **Persian-First & RTL**: Every UI view must render naturally in right-to-left with Persian numerals and Toman pricing.
4. **Multi-Client Consistency**: Authoritative business rules remain on the server; never duplicate business rules between Web and Mobile.
5. **Zero Tolerance for Fake Urgency**: Do not inject artificial countdowns or fabricated viewer counters.
