# Milestone M08 — Admin Platform Specification

> **Milestone**: M08  
> **Title**: Admin Platform  
> **Status**: `Completed`  
> **Target Completion**: 100%

---

# Objective

Construct the central administrative operations console (`/admin`), empowering platform operators to verify merchants, oversee marketplace listings, manage customer accounts, arbitrate disputes, process refunds, manage product categories and commission rules, and inspect immutable audit logs.

---

# Context

To maintain trust, legal compliance, and quality control at scale, marketplace administrators need a comprehensive control center to verify partner stores, monitor food safety incidents, manage revenue commission tiers, and oversee platform integrity.

---

# Dependencies

* **M07 — Merchant Product** (merchant accounts and operational listings exist).

---

# Scope

* Central Admin Dashboard:
  * Marketplace KPIs: Active merchants, daily published listings, active customer orders, 24-hour GMV, platform commission, open dispute tickets.
* Merchant Management:
  * Verification queue for new business onboarding.
  * Inspection of guild permits (جواز کسب), tax IDs, and hygiene certifications.
  * 1-click status override: `PENDING` → `APPROVED` / `SUSPENDED` / `REJECTED`.
* Customer Management:
  * User profile inspector, cumulative savings tracker, purchase history, order status, and complaint records.
* Listing & Category Management:
  * Global listing moderation table with search, category filtering, and status overrides.
  * Category hierarchy editor (add/edit categories, icons, and descriptions).
* Order & Dispute Resolution:
  * Real-time order stream with status filters (`PAID`, `COMPLETED`, `REFUNDED`, `NO_SHOW`).
  * Dispute resolution console: Customer complaint details, photo evidence inspector, merchant response, and 1-click refund button.
* Commission & Financial Control:
  * Global and per-merchant commission rules (default: 10%).
  * Merchant settlement sheet generator (gross GMV minus commission minus refunds).
* Immutable Audit Log Viewer:
  * Searchable, filterable event log recording actor, action, resource, diff JSON, and IP address.
* System Configuration & Feature Flags:
  * Maintenance mode toggle, global banner announcements, SMS provider switcher.

---

# Out of Scope

* Advanced predictive data science models and cohorts (M09).
* Automated bank core Paya/Satna file generation (can be manual CSV export for MVP).

---

# Functional Requirements

1. Only authenticated users with `role = 'ADMIN'` can access any `/admin/*` route.
2. Approving a merchant immediately enables them to publish live public listings.
3. Suspending a merchant immediately hides all their active listings from customer discovery.
4. Admin can override commission rate for a specific merchant (e.g. promotional 5% for first month).
5. All administrative actions (refunds, suspensions, status overrides) write an immutable record to `AuditLog`.

---

# UX Requirements

1. Dense, desktop-first data tables with sorting, pagination, and multi-field filtering.
2. Status pill badges using consistent design tokens: Green (`APPROVED`), Amber (`PENDING`), Red (`SUSPENDED`/`UNSAFE`).
3. Confirmation modals with reason text box for destructive actions (suspending a store, rejecting a listing).

---

# Technical Requirements

1. Next.js App Router sub-tree under `/app/admin/*` protected by strict RBAC middleware.
2. Server Actions for administrative mutations with mandatory audit trail wrapper.
3. Real-time or SWR polling for new urgent safety complaints.

---

# Database Requirements

* Full administrative query capabilities across all schema tables (`User`, `Merchant`, `Listing`, `Order`, `Payment`, `AuditLog`, `CommissionRule`).
* Efficient pagination using keyset or indexed `LIMIT/OFFSET`.

---

# Security Requirements

* Two-factor authentication (2FA / secondary OTP) enforced for administrative logins.
* Zero exposure of customer credit card numbers or raw SMS OTPs in admin tables.
* Session timeout enforced after 30 minutes of inactivity.

---

# Testing Requirements

* **Unit Tests**: Commission rule evaluation, merchant approval state transitions.
* **Integration Tests**: Admin RBAC gatekeeper blocks non-admin users with HTTP 403.
* **E2E Tests**: Admin reviews pending merchant, inspects documents, approves merchant, edits commission rate, and views audit log.

---

# Acceptance Criteria

1. [x] Non-admin users are strictly blocked from `/admin/*`.
2. [x] Admin can inspect pending merchants and approve or suspend them.
3. [x] Admin can review customer complaints and authorize immediate refunds.
4. [x] Admin can modify commission rates globally or per merchant.
5. [x] Every admin action is recorded with full diff in `AuditLog`.

---

# Checkpoints

- [x] **CP-08.1**: Build Admin layout shell, navigation, and core KPI dashboard.
- [x] **CP-08.2**: Build Merchant Verification and Management console.
- [x] **CP-08.3**: Build Customer Profile and Order History inspector.
- [x] **CP-08.4**: Build Global Listing and Category Manager.
- [x] **CP-08.5**: Build Dispute Resolution and Refund Console.
- [x] **CP-08.6**: Build Commission Rule engine and settlement exporter.
- [x] **CP-08.7**: Build Audit Log viewer and system configuration view.
- [x] **CP-08.8**: Run admin security tests and verification workflows.

---

# Definition of Done

* Platform operations team can supervise and manage all marketplace actors without direct database manipulation.
* Checkpoints completed and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with admin platform verification.
