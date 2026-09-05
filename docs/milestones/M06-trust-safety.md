# Milestone M06 — Trust, Safety & Moderation Specification

> **Milestone**: M06  
> **Title**: Trust, Safety & Moderation  
> **Status**: `Pending`  
> **Target Completion**: 0%

---

# Objective

Implement the platform trust architecture, including merchant hygiene verification, listing safety state machines, post-pickup customer review loops, customer complaint and incident reporting with photo evidence, administrative moderation queues, automated refund triggers, and immutable audit logs.

---

# Context

Safety is non-negotiable on Loqme. Customers must feel absolute confidence in the hygiene, freshness, and authentic value of their purchases. When unexpected quality issues arise, frictionless customer dispute channels and rapid administrative resolution protect platform integrity.

---

# Dependencies

* **M05 — Pickup Verification** (reviews and complaints can only be filed against authenticated completed orders).

---

# Scope

* Listing Safety Lifecycle & Enforcement:
  * Transitions for `safetyStatus`: `PENDING_REVIEW` → `APPROVED` → `RESTRICTED` → `UNSAFE` → `EXPIRED`.
  * Automatic checkout lockout for any non-`APPROVED` listing.
* Verified Customer Review Loop:
  * Only customers with verified `COMPLETED` pickups can submit reviews.
  * Rating breakdown: Overall rating (1–5), Food Quality (1–5), Value-for-Money (1–5), Persian text review.
  * Merchant reply capability.
* Dispute & Complaint Workflow:
  * Customer complaint submission categories:
    * `EXPIRED_FOOD` (Immediate critical alert)
    * `SPOILED_FOOD`
    * `STORE_CLOSED`
    * `VALUE_DEFICIT` (Bag fell below guaranteed floor)
    * `WRONG_ITEMS`
  * Multi-image photo upload for physical evidence.
* Admin Moderation & Investigation Console:
  * Incident ticket queue with priority escalation for food safety tags.
  * Merchant temporary freeze / delisting trigger.
* Automated & Admin-Directed Refund Flow:
  * 1-click refund authorization returning funds to customer bank card via payment gateway.
  * Automatic penalty debit to merchant payout ledger.
* Immutable Audit Log:
  * Tracks every safety status transition, listing suspension, and refund decision.

---

# Out of Scope

* Full merchant analytics and sales projections (M07 / M09).
* Full multi-tab admin financial reconciliation (M08).

---

# Functional Requirements

1. Reviews can ONLY be submitted once per completed order.
2. A customer complaint flagged as `EXPIRED_FOOD` or `SPOILED_FOOD` automatically alerts the admin duty team and transitions the merchant's other active listings to `RESTRICTED` if threshold (2 reports in 7 days) is breached.
3. Admin approval of a refund marks the order `REFUNDED`, creates an entry in `FinancialTransaction`, and triggers `IPaymentGateway.refundPayment`.

---

# UX Requirements

1. Empathetic, respectful complaint filing interface: «ما متعهد به تضمین کیفیت و سلامت لقمه شما هستیم.»
2. Clear status updates on submitted complaints (در حال بررسی، تایید شده، عودت وجه انجام شد).
3. Public review cards highlight verified purchase badge («خریدار تاییدشده لقمه»).

---

# Technical Requirements

1. Secure image upload handler verifying image MIME headers (JPEG/PNG/WebP), max 5MB, renamed with UUIDs.
2. Domain service `ModerationService` coordinates reviews, complaints, and safety status transitions.
3. Every moderation action logged in `AuditLog` table with IP address and diff JSON.

---

# Database Requirements

* Entities: `Review`, `Complaint`, `ListingSafety`, `AuditLog`, `Refund`.
* Unique constraint on `Review(orderId)`.
* Foreign key references linking complaints to orders, customers, and merchants.

---

# Security Requirements

* Only users with `ADMIN` role can access moderation queues and issue manual refunds.
* Image uploads strictly scanned to prevent HTML or executable file hosting.
* Review submission verified against session `customerId` matching `order.customerId`.

---

# Testing Requirements

* **Unit Tests**: Safety state transitions, review score aggregation calculation.
* **Integration Tests**: Block purchase when listing is marked `UNSAFE`; refund ledger creation.
* **E2E Tests**: Customer completes pickup, files a complaint with photo upload, admin inspects ticket and issues full refund.

---

# Acceptance Criteria

1. [ ] Unsafe or expired listings cannot be added to cart or reserved.
2. [ ] Verified customer can submit review after completed pickup.
3. [ ] Customer can file complaint with photo evidence.
4. [ ] Admin can inspect complaints, suspend listings, and trigger refunds.
5. [ ] Every moderation action creates an immutable audit log entry.

---

# Checkpoints

- [ ] **CP-06.1**: Implement `ListingSafety` state machine and checkout enforcement guards.
- [ ] **CP-06.2**: Build Post-Pickup Customer Review submission and merchant response flow.
- [ ] **CP-06.3**: Build Customer Complaint filing interface with multi-image photo upload.
- [ ] **CP-06.4**: Build Admin Moderation Queue and incident ticket dashboard.
- [ ] **CP-06.5**: Implement Refund authorization and merchant penalty debit workflow.
- [ ] **CP-06.6**: Implement immutable `AuditLog` service.
- [ ] **CP-06.7**: Run integration and E2E moderation tests.

---

# Definition of Done

* Platform safety policy enforced programmatically at database and API levels.
* Dispute resolution loop completes with verified refund execution.
* Checkpoints completed and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with moderation metrics and audit log verification.
