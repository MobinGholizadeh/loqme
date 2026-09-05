# Milestone M04 — Orders, Inventory & Payments Specification

> **Milestone**: M04  
> **Title**: Orders, Inventory & Payments  
> **Status**: `Pending`  
> **Target Completion**: 0%

---

# Objective

Build the high-concurrency checkout engine, including atomic 10-minute reservation locks, Iranian payment gateway abstraction with server-side callback verification, the Order lifecycle state machine, double-entry financial ledger records, and refund processing abstraction.

---

# Context

M04 represents the financial and operational core of Loqme. It bridges customer desire with confirmed commercial commitments, ensuring that inventory never oversells even under sudden surge demand, and that payment transactions are strictly verified server-side.

---

# Dependencies

* **M03 — Marketplace Discovery** (customers can view and select active listings).

---

# Scope

* Atomic Reservation Engine:
  * 10-minute temporary inventory reservation lock.
  * Auto-release worker/mechanism for expired unpaid reservations.
* Checkout Interface:
  * Order summary: Store name, pickup window, quantity, price breakdown (Toman).
  * Terms acceptance (food pickup commitment and perishable policy).
* Iranian Payment Gateway Abstraction (`IPaymentGateway`):
  * `MockPaymentGateway` for development and automated testing.
  * `ZarinpalGatewayAdapter` / `SamanGatewayAdapter` production integrations.
  * Server-to-server callback verification and amount matching.
* Order Lifecycle State Machine:
  * `PENDING_PAYMENT` → `PAID` → `READY_FOR_PICKUP` → `COMPLETED` / `CANCELLED` / `REFUNDED`.
* Financial Transaction Ledger:
  * Double-entry bookkeeping tracking GMV, platform commission, merchant net payout balance.
* Concurrency Defense:
  * Database-level atomic conditional updates preventing overselling.
* Refund Abstraction:
  * Core programmatic refund mechanism (`refundPayment`).

---

# Out of Scope

* Physical in-store QR scanning / OTP verification (M05).
* Customer dispute filing and refund arbitration UI (M06).
* Automated bank payout transfers via Paya/Satna (M08).

---

# Functional Requirements

1. Customer taps "Reserve & Pay": System creates a `Reservation` with `expiresAt = NOW() + 10 minutes`.
2. Available quantity (`total - reserved - sold`) decrements immediately.
3. If payment succeeds within 10 minutes, reservation transitions to `CONVERTED_TO_ORDER` and order transitions to `PAID`.
4. If payment fails or times out, reservation expires and inventory is restored.
5. Server verifies gateway callback using payment reference token; matches verified amount against stored order amount before crediting.

---

# UX Requirements

1. Prominent, live 10-minute countdown timer on checkout screen («زمان باقیمانده برای تکمیل پرداخت: ۰۹:۴۵»).
2. Clear confirmation screen upon payment success with pickup time reminders in Persian.
3. Friendly error messages if payment fails or bank connection drops, with a 1-tap retry button.

---

# Technical Requirements

1. Server Actions / Route Handlers strictly delegate to `ReservationService`, `OrderService`, and `PaymentService`.
2. Atomic SQL transaction:
   ```sql
   UPDATE "ListingInventory"
   SET "reservedQuantity" = "reservedQuantity" + 1
   WHERE "listingId" = $1 AND ("totalQuantity" - "reservedQuantity" - "soldQuantity") >= 1;
   ```
3. Idempotency key checked on every checkout initiation.

---

# Database Requirements

* Entities: `Reservation`, `Order`, `OrderItem`, `Payment`, `PaymentEvent`, `FinancialTransaction`, `Refund`.
* Unique constraint on `Order(reservationId)`.
* Database check constraint: `reservedQuantity >= 0` and `soldQuantity >= 0`.

---

# Security Requirements

* Client NEVER submits order totals or commission amounts.
* Payment gateway callback verifies amount with PSP server before updating order status.
* Reject any callback where `verifiedAmount != order.totalAmountToman`.

---

# Testing Requirements

* **Unit Tests**: State machine transitions, commission calculation (10%), discount logic.
* **Integration Tests**: Gateway callback handling, transaction rollback on failure.
* **Concurrency Test**: 20 concurrent threads attempting to purchase the last 2 remaining Surprise Bags. Exactly 2 must succeed; 18 must receive stock-out errors. Zero overselling.

---

# Acceptance Criteria

1. [ ] Customer can initiate reservation and lock stock for 10 minutes.
2. [ ] Mock payment gateway successfully transitions order to `PAID`.
3. [ ] Unpaid reservations auto-release stock back to inventory upon expiry.
4. [ ] Multi-threaded concurrency test passes with zero overselling.
5. [ ] Financial transaction ledger correctly records GMV and 10% commission.

---

# Checkpoints

- [ ] **CP-04.1**: Implement `ReservationService` and atomic inventory locking.
- [ ] **CP-04.2**: Build Checkout summary UI and 10-minute countdown timer.
- [ ] **CP-04.3**: Implement `IPaymentGateway` abstraction and `MockPaymentGateway`.
- [ ] **CP-04.4**: Build Server payment verification callback endpoint.
- [ ] **CP-04.5**: Implement `OrderService` state machine transitions.
- [ ] **CP-04.6**: Implement `FinancialTransaction` double-entry ledger records.
- [ ] **CP-04.7**: Execute automated concurrency stress test (20 simultaneous checkout requests).

---

# Definition of Done

* Concurrency stress test passes without race conditions.
* Complete purchase lifecycle functions in development with mock gateway.
* Checkpoints verified and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with concurrency test results and payment metrics.
