# Security Architecture & Policies — Loqme (لقمه)

> **Core Axiom**: Never trust client-provided state. Critical financial, inventory, pricing, and authorization operations are strictly server-owned.

---

## 1. Authentication & Session Management

* **Phone-First OTP**: Authentication is anchored on verified Iranian mobile phone numbers (`09xxxxxxxxx`).
* **Cryptographic OTP Generation**: 5-digit cryptographically secure pseudo-random numbers (CSPRNG). Validity window: **2 minutes**.
* **Rate Limiting**: Maximum 3 OTP requests per 10-minute window per phone number and per client IP to prevent SMS fatigue and gateway exhaustion.
* **Session Storage**: Secure, signed HTTP-only cookies (`SameSite=Lax`, `Secure` in production). No sensitive access tokens stored in browser `localStorage`.

---

## 2. Role-Based Access Control (RBAC) & Authorization Boundaries

### 2.1 Role Hierarchy
* `CUSTOMER`: Can browse, reserve, purchase, view personal orders, generate pickup codes, submit reviews, file complaints.
* `MERCHANT_STAFF`: Can view assigned store's active pickup queue and scan/verify customer QR codes or OTPs.
* `MERCHANT_OWNER`: Has staff permissions plus can manage store profile, operating hours, staff accounts, create/edit listings, and view payout statements.
* `ADMIN`: Full platform oversight across all merchants, listings, orders, refunds, and audit logs.

### 2.2 Strict Boundary Checks
* **Merchant Ownership Verification**: Every merchant API mutation verifies that the authenticated user is the verified owner or staff of that specific `merchantId`.
* **Order Ownership**: Customers can only inspect their own orders. Merchants can only inspect orders directed to their storefronts.

---

## 3. Server-Side Validation & Untrusted Client Rules

> [!WARNING]
> The client must NEVER submit calculations, prices, discounts, or inventory counts.

1. **Prices & Totals**: The client submits only `{ listingId, quantity }`. The server looks up current active database pricing, calculates discounts, computes commission, and generates the immutable order amount.
2. **Input Sanitization**: All user inputs (descriptions, reviews, addresses) pass through strict Zod schemas and HTML escaping to prevent Cross-Site Scripting (XSS).

---

## 4. Payment Verification & Idempotency

* **Server-to-Server Callback**: Payment verification is executed via authenticated backend-to-gateway HTTP requests. We never trust client-redirect query parameters alone.
* **Double Verification Prevention**: When a gateway callback arrives, the transaction is verified once. If a duplicate webhook arrives, it responds with the existing result without re-executing credit logic.
* **Amount Matching**: The amount verified with the gateway must match the exact `Order.totalAmountToman` stored in the database down to the exact rial/toman.
* **Idempotency Keys**: Payment checkout requests enforce client-generated UUID idempotency keys to prevent double-charging on network retry.

---

## 5. Inventory Concurrency & Reservation Locking

To guarantee zero overselling under high concurrency (e.g. 50 customers attempting to reserve the last 2 Surprise Bags simultaneously):

1. **Atomic Decrement Pattern**:
   ```sql
   UPDATE "ListingInventory"
   SET "reservedQuantity" = "reservedQuantity" + :requestedQty,
       "version" = "version" + 1
   WHERE "listingId" = :listingId
     AND ("totalQuantity" - "reservedQuantity" - "soldQuantity") >= :requestedQty;
   ```
2. **Reservation Expiration Job**: Unpaid reservations expire after 10 minutes. A background worker periodically or reactively rolls back `reservedQuantity`.
3. **Checkout Finalization**: Upon verified payment, `reservedQuantity` is decremented and `soldQuantity` is incremented in a single ACID transaction.

---

## 6. Pickup Verification Security

* **Dynamic Time-Hashed QR Codes**: The customer QR code contains a signed JWT payload containing `orderId` and a rolling timestamp. Static screenshots expire to prevent replay attacks.
* **Fallback 4-Digit OTP**: Displayed on the customer's phone for manual merchant entry if the merchant camera is unavailable.
* **Atomic State Transition**: Verification sets `isVerified = true` and order status to `COMPLETED` inside a single atomic database transaction, making double-redemption mathematically impossible.

---

## 7. File Upload & Media Security

* **MIME Type & Magic Number Inspection**: Uploaded merchant and complaint images are checked for real image headers (JPEG, PNG, WebP), rejecting executables or disguised scripts.
* **File Size Cap**: Strict 5MB limit per image.
* **Filename Sanitization**: Uploaded files are renamed using random UUIDs before being saved to object storage. Direct public file execution on disk is completely disabled.

---

## 8. Rate Limiting & Abuse Prevention

* **Global API Rate Limit**: 100 requests per minute per IP for general browsing.
* **Sensitive Endpoints**:
  * `/api/auth/otp/send`: Max 3 requests / 10 mins.
  * `/api/auth/otp/verify`: Max 5 failed attempts before 15-minute lockout.
  * `/api/checkout/reserve`: Max 10 reservation attempts / 15 mins.

---

## 9. Audit Logging & Compliance

* **Immutable Audit Trail**: All administrative overrides (safety status change, manual refund, merchant suspension) write an immutable record to the `AuditLog` table capturing:
  * Actor ID & Role
  * Action Name
  * Target Resource Type & ID
  * State Diff (`beforeJson` / `afterJson`)
  * IP Address & Timestamp
* **Zero Sensitive Data in Logs**: Passwords, raw OTP codes, full payment tokens, and national IDs must NEVER appear in application log streams.

---

## 10. Secret Management

* All secret keys (`DATABASE_URL`, `JWT_SECRET`, `PAYMENT_GATEWAY_KEY`, `SMS_API_KEY`, `S3_SECRET_KEY`) reside exclusively in environment variables.
* No credentials, certificates, or production keys may ever be committed to git.
* A clean, comprehensive `.env.example` file is provided for developer onboarding.
