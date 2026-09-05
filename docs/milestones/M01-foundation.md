# Milestone M01 — Application Foundation Specification

> **Milestone**: M01  
> **Title**: Application Foundation  
> **Status**: `Pending`  
> **Target Completion**: 0%

---

# Objective

Scaffold the production-grade Next.js application foundation, configure TypeScript, establish PostgreSQL database connectivity and migration pipeline, implement SMS/OTP authentication, establish Role-Based Access Control (RBAC), and build the Persian RTL design-token foundation with base application shells for Customer, Merchant, and Admin interfaces.

---

# Context

M01 transforms the documented architecture into a running, buildable software foundation. It delivers the foundational plumbing (database, auth, design tokens, layout shells) upon which all subsequent business domains rely.

---

# Dependencies

* **M00 — Project Discovery & Architecture** (must be 100% completed).

---

# Scope

* Next.js 14+ (App Router) project initialization with TypeScript and ESLint.
* Database connectivity: PostgreSQL connection pooling with Prisma ORM setup.
* Initial database schema migration for `User`, `Role`, `Customer`, and `MerchantStaff`.
* Iranian SMS / OTP authentication flow with rate limiting and session cookies.
* RBAC middleware supporting roles: `CUSTOMER`, `MERCHANT_STAFF`, `MERCHANT_OWNER`, `ADMIN`.
* Centralized design tokens injected as CSS custom properties (`:root`).
* Vazirmatn typography integration with RTL (`dir="rtl"`) layout hierarchy.
* Base layout shells:
  * Customer App Shell (Mobile-first bottom navigation bar & header).
  * Merchant Portal Shell (Sidebar / desktop header with store switcher).
  * Admin Console Shell (Admin navigation with audit and status views).
* Base reusable UI primitives: `Button`, `Input`, `Card`, `Badge`, `Modal`, `Spinner`.
* Comprehensive `.env.example` and runtime configuration validation using Zod.

---

# Out of Scope

* Marketplace listing management or discovery (M02 / M03).
* Payment gateway integrations (M04).
* In-person pickup verification (M05).
* Moderation and safety incident workflows (M06).

---

# Functional Requirements

1. **Phone Number Authentication**:
   * User enters mobile number (`09xxxxxxxxx`).
   * System generates 5-digit OTP code, stores hashed token with 2-minute expiry, and dispatches SMS via `INotificationService` abstraction.
   * User submits OTP; upon verification, a secure HttpOnly session cookie is issued.
2. **Role-Based Routing**:
   * Visiting `/merchant/*` requires `MERCHANT_STAFF` or `MERCHANT_OWNER` role.
   * Visiting `/admin/*` requires `ADMIN` role.
   * Unauthorized visits redirect to login with return URL.
3. **Locale & Layout**:
   * All pages default to `fa-IR` and `dir="rtl"`.
   * Standard Persian typography (Vazirmatn) active across all layout viewports.

---

# UX Requirements

1. Clean, responsive layouts rendering smoothly on mobile viewports (360px–430px) and desktop screens (1024px+).
2. Buttons provide clear loading states with spinners during async operations.
3. Form validation errors display in Persian below inputs.

---

# Technical Requirements

1. Next.js App Router with Route Handlers for API endpoints.
2. Zod validation schemas for all incoming auth payloads.
3. Centralized token variables loaded via `globals.css` without inline magic numbers.
4. Clean separation of concerns: Route handlers call `AuthService` and `UserService`.

---

# Database Requirements

* PostgreSQL database connection verified.
* Prisma schema containing `User`, `Customer`, and `Session` models.
* Migration generated and executed: `0001_init_auth_users`.

---

# Security Requirements

* Rate limiting enforced on OTP generation (max 3 per 10 mins).
* Session cookies configured with `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
* Passwords (if used) hashed with bcrypt or Argon2; raw passwords never persisted.

---

# Testing Requirements

* **Unit Tests**: OTP generation, verification validation, and role permission checks.
* **Integration Tests**: Database user creation and session persistence.
* **Build Verification**: `npm run build` passes with zero TypeScript or lint errors.

---

# Acceptance Criteria

1. [ ] Customer, Merchant, and Admin layout shells render cleanly.
2. [ ] Phone number OTP login works via mock notification service.
3. [ ] Role-based access control blocks unauthorized routes.
4. [ ] RTL styling and Vazirmatn font render properly across all shells.
5. [ ] `npm run build` succeeds without warnings or errors.

---

# Checkpoints

- [ ] **CP-01.1**: Initialize Next.js, TypeScript, and ESLint configuration.
- [ ] **CP-01.2**: Configure design tokens, CSS variables, and Vazirmatn font in RTL mode.
- [ ] **CP-01.3**: Configure PostgreSQL database connection and Prisma ORM setup.
- [ ] **CP-01.4**: Build Auth Domain Service, OTP generation, and session cookie middleware.
- [ ] **CP-01.5**: Build base UI primitives (`Button`, `Input`, `Card`, `Badge`, `Modal`).
- [ ] **CP-01.6**: Build Customer, Merchant, and Admin layout shells.
- [ ] **CP-01.7**: Write unit and integration tests; verify clean production build.

---

# Definition of Done

* Application builds cleanly (`npm run build`).
* Auth flow functions end-to-end with mock SMS.
* All checkpoints verified and checked off.
* `docs/PROJECT_STATUS.md` updated to reflect M01 completion.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with M01 test outputs and environment notes.
* Document any new environment variables in `.env.example`.
