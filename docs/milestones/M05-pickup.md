# Milestone M05 — Pickup Verification Specification

> **Milestone**: M05  
> **Title**: Pickup Verification  
> **Status**: `Pending`  
> **Target Completion**: 0%

---

# Objective

Implement the in-person pickup verification workflow, providing customers with dynamic, time-hashed QR codes and backup 4-digit OTPs, and equipping merchants with a real-time pickup queue and scanner interface to complete physical handoffs securely, preventing double-pickup and managing no-shows.

---

# Context

Physical in-person pickup is fundamental to Loqme's model. It builds neighborhood community connection, ensures food is in prime condition at handoff, and drives retail foot traffic. The verification handshake must be frictionless, instantaneous, and cryptographically secure.

---

# Dependencies

* **M04 — Orders, Inventory & Payments** (orders can reach `PAID` / `READY_FOR_PICKUP` status).

---

# Scope

* Customer Pickup Credentials Screen:
  * Dynamic time-hashed QR code (auto-refreshes every 60 seconds to prevent screenshot sharing).
  * 4-digit fallback numeric OTP (e.g. `۸۴۹۱`).
  * Human-readable short order code (e.g. `LQ-10492`).
  * Live store directions button (opens map app).
  * Store address, contact phone, and remaining pickup countdown.
* Merchant Pickup Management View:
  * Real-time active pickup queue sorted by upcoming pickup window.
  * In-browser QR camera scanner (using HTML5 camera API).
  * Manual 4-digit OTP / Order Code input field.
  * Instant auditory & visual verification confirmation (success chime and green checkmark).
* Double-Pickup Prevention Engine:
  * Atomic transition of order to `COMPLETED` upon first scan; subsequent scans return immediate `ALREADY_PICKED_UP` alert with timestamp.
* No-Show Handling:
  * Automated transition to `NO_SHOW` when pickup window closes without verification.
* Notification Reminders:
  * Automated reminder sent to customer 45 minutes prior to pickup window closure.

---

# Out of Scope

* Post-pickup customer review submission (M06).
* Complex merchant analytics and sales reports (M07 / M09).

---

# Functional Requirements

1. Once an order is `PAID`, customer app displays the dynamic QR code and 4-digit OTP.
2. When merchant scans QR or submits OTP via `/api/pickup/verify`:
   * System verifies that the scanning staff belongs to the fulfilling merchant.
   * System atomically updates `PickupVerification.isVerified = true` and `Order.status = 'COMPLETED'`.
3. If an order is already marked `COMPLETED`, scanning rejects the request with HTTP 409 Conflict.
4. If pickup window elapses without verification, a scheduled worker marks the order `NO_SHOW`.

---

# UX Requirements

1. High screen brightness prompt when viewing the QR code on mobile.
2. Fast merchant camera scanner: decodes QR within 500ms.
3. Warm celebration screen for customer upon successful pickup: «نوش جان! امیدواریم از لقمه‌تان لذت ببرید.»

---

# Technical Requirements

1. QR token signed with HMAC using server secret; payload contains `orderId` and issuance timestamp.
2. HTML5 WebRTC camera access with fallback to manual 4-digit keypad.
3. Zero network lag: Local state optimistic update on merchant screen followed by server confirmation.

---

# Database Requirements

* Entities: `PickupVerification` (1:1 with `Order`).
* Index on `PickupVerification(otpCode, isVerified)` and `Order(merchantId, status)`.

---

# Security Requirements

* Camera scanner endpoint strictly restricted to `MERCHANT_STAFF` and `MERCHANT_OWNER` belonging to the specific order's store.
* Cross-merchant scanning attempts rejected with audit log entry.
* Max 5 failed OTP attempts before temporary 15-minute lock on that order's verification.

---

# Testing Requirements

* **Unit Tests**: QR token cryptographic generation and HMAC signature validation.
* **Integration Tests**: Verification handshake atomically completing the order.
* **Concurrency / Double-Pickup Test**: 5 simultaneous verify requests for the exact same order token. Exactly 1 must succeed; 4 must fail.

---

# Acceptance Criteria

1. [ ] Customer receives dynamic QR code and 4-digit OTP upon completing payment.
2. [ ] Merchant camera scanner decodes QR and marks order `COMPLETED`.
3. [ ] Manual OTP entry works if camera is denied.
4. [ ] Double-redemption test confirms it is impossible to pick up an order twice.
5. [ ] Expired unpicked orders transition to `NO_SHOW`.

---

# Checkpoints

- [ ] **CP-05.1**: Build `PickupService` with dynamic QR hashing and 4-digit OTP generator.
- [ ] **CP-05.2**: Build Customer Pickup Credentials screen with dynamic QR display and countdown.
- [ ] **CP-05.3**: Build Merchant live pickup queue view.
- [ ] **CP-05.4**: Implement Merchant HTML5 QR scanner and manual OTP keypad.
- [ ] **CP-05.5**: Implement atomic verification handshake and double-pickup prevention.
- [ ] **CP-05.6**: Build no-show worker and automated pickup reminder triggers.
- [ ] **CP-05.7**: Run integration and double-pickup concurrency test.

---

# Definition of Done

* Merchant can scan and complete an order in under 2 seconds.
* Double-pickup is mathematically impossible.
* Checkpoints completed and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with pickup verification latency and test results.
