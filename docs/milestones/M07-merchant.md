# Milestone M07 — Merchant Product Specification

> **Milestone**: M07  
> **Title**: Merchant Product  
> **Status**: `Completed`  
> **Target Completion**: 100%

---

# Objective

Deliver an autonomous, high-efficiency merchant management portal enabling store owners and staff to manage daily surplus listings (under 60-second creation), monitor active pickup queues, view daily revenue and settlement statements, configure store hours and pickup windows, and manage staff access without administrative intervention.

---

# Context

Merchants are busy shopkeepers, bakers, and cafe baristas operating during peak evening rush. The merchant product must be exceptionally fast, intuitive, and mobile-friendly, allowing staff to publish bags in seconds and manage pickups effortlessly.

---

# Dependencies

* **M06 — Trust, Safety & Moderation** (merchant reviews, complaints, and safety status rules established).

---

# Scope

* Merchant Dashboard Overview:
  * Today's summary: Active listings, bags sold, pending pickups, today's gross revenue (Toman).
  * Quick-action floating button: «ثبت لقمه جدید» (Create New Listing).
* Rapid Listing Creation Engine (Under 60 Seconds):
  * Templates for recurring daily offerings (e.g. "بسته شیرینی عصرانه روحی").
  * 3-step listing flow: Select Category → Set Quantity & Toman Prices → Confirm Pickup Window.
  * Instant publish button with draft option.
* Active Listing & Inventory Management:
  * Real-time list of published, paused, sold-out, and expired listings.
  * 1-tap stock adjustment (add +1 or pause listing if kitchen runs out).
* Live Order & Pickup Management:
  * Grouped by status: `READY_FOR_PICKUP`, `COMPLETED`, `NO_SHOW`.
  * Integrated QR scanner launcher and 4-digit OTP lookup.
* Business Profile & Location Editor:
  * Store name, category, Persian bio, storefront photos, contact phone.
  * Map pin drag-and-drop to fine-tune exact storefront entrance coordinates.
* Operating Hours & Pickup Schedule:
  * Daily operating hours (Sat–Fri) and default surplus collection window.
* Staff Management (Owner Only):
  * Add store employees by mobile phone number; assign roles (`MANAGER`, `CASHIER`).
  * Revoke staff access.
* Financial & Payout Summary:
  * Historical breakdown of gross sales, 10% platform commission, and net payout balance.

---

# Out of Scope

* Global multi-merchant administrative oversight (M08).
* Platform-wide macro analytics and density heatmaps (M09).

---

# Functional Requirements

1. A merchant owner can log in, create a Surprise Bag with 5 units, and have it appear live in marketplace search in under 60 seconds.
2. Fast stock adjustment: Tapping "Pause" immediately hides the listing from public customer search.
3. Store owner can invite a cashier by mobile number; cashier can log in and immediately scan customer pickup QR codes.

---

# UX Requirements

1. High contrast, clean layout optimized for smartphone screens on a store counter or kitchen prep table.
2. Persian numerical inputs with automatic Toman formatting (e.g. `۶۵,۰۰۰ تومان`).
3. Confirmation dialogs on destructive actions (deleting listings, revoking staff).

---

# Technical Requirements

1. Route access restricted by middleware: `/merchant/*` requires `MERCHANT_STAFF` or `MERCHANT_OWNER`.
2. All data queries strictly scoped to `session.merchantId`.
3. Optimistic UI updates on listing pause/activate toggles.

---

# Database Requirements

* Scoped queries utilizing `MerchantStaff(userId, merchantId)`.
* Indexes on `Listing(merchantId, status)` and `Order(merchantId, status)`.

---

# Security Requirements

* Strict tenant isolation: Store A staff cannot read, edit, or scan Store B listings or orders.
* Only `MERCHANT_OWNER` can edit banking info, view net payout statements, or invite/remove staff.

---

# Testing Requirements

* **Unit Tests**: Fast listing creator validation, staff permission boundary tests.
* **Integration Tests**: Tenant isolation (Merchant A cannot access Merchant B resources).
* **E2E Tests**: Store owner onboards cashier, creates a Surprise Bag, adjusts quantity, and reviews daily earnings.

---

# Acceptance Criteria

1. [x] Merchant owner can create and publish a Surprise Bag in under 60 seconds.
2. [x] Merchant can adjust remaining stock or pause listing with instant marketplace reflection.
3. [x] Store owner can add cashier staff; cashier can successfully verify customer pickups.
4. [x] Merchant dashboard displays accurate daily sales, commissions, and net earnings.
5. [x] Merchant operates all regular daily workflows without admin assistance.

---

# Checkpoints

- [x] **CP-07.1**: Build Merchant Dashboard layout shell, header, and today's KPI cards.
- [x] **CP-07.2**: Build 60-Second Fast Listing Creator with preset templates.
- [x] **CP-07.3**: Build Active Listing Manager with instant pause/stock adjustment.
- [x] **CP-07.4**: Build Business Profile and Storefront Location map editor.
- [x] **CP-07.5**: Build Operating Hours and Pickup Window configuration view.
- [x] **CP-07.6**: Build Staff Management view with role invitations.
- [x] **CP-07.7**: Build Financial & Settlement statement view.
- [x] **CP-07.8**: Run tenant security tests and end-to-end merchant workflow tests.

---

# Definition of Done

* Merchant can operate end-to-end independently.
* Tenant boundaries 100% verified against cross-tenant data leaks.
* Checkpoints completed and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with merchant portal completion status.
