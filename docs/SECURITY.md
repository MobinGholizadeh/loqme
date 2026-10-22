# Security Architecture & Policies — Loqme (لقمه)

> **Core Axiom**: Never trust client-provided state. Critical financial, inventory, pricing, and authorization operations are strictly server-owned.

---

## 1. Authentication & Session Management

CP-10.19 (2026-10-03): Login is now the default OTP intent; only explicit registration permits a missing account. Phone checks run after rate limiting; request routes add an IP limit, browser-origin checks, bounded bodies and no-store. Public account lookup is retired (410); limited existence disclosure in the login form is intentional. Production sessions reject missing/short/default signing keys. Android releases use a stable private signing key and verify the live website association before publication. Exact limits, proxy assumptions, residual per-process throttling, development dependency advisory and release gates are in [CP10_19_ANDROID_AUTH_SECURITY.md](CP10_19_ANDROID_AUTH_SECURITY.md).

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

CP-10.9: Merchant portal pages are for `MERCHANT_OWNER` and `MERCHANT_STAFF` only. `ADMIN` uses `/admin`, not merchant impersonation; authenticated users with the wrong role are redirected to their own area, not back to login. The merchant resolver checks current active user role and store membership, including pickup queue reads with an explicit merchant ID. Header/footer portal links follow the session role. Existing personal purchasing behavior for signed-in accounts is unchanged pending a separate product decision.

Listing gallery uploads accept authenticated store members only, stream at most 5 MiB, decode JPEG/PNG/WebP with a 20-million-pixel limit, reject animation, auto-orient and re-encode to metadata-free WebP. Random filenames and validated merchant UUID paths prevent traversal and cross-store references. Photos are intentionally public. `LISTING_IMAGE_STORAGE_DIR` must point to persistent storage for deployment; the local adapter defaults to `.data/listing-images`. Catalog photos are explicitly illustrative and marked in every `ListingImage` rendering. No database migration is needed. Deployment still requires proxy request/rate limits, storage quotas, backups and lifecycle management of unreferenced uploads; this local checkpoint does not introduce a managed object-store service.

CP-10.10: `/api/admin/merchants/[id]/account` requires a currently active database `ADMIN`, not only a signed role claim. Responses contain the linked owner's phone/identity/status, staff summaries and paginated orders scoped to that merchant; they never include passwords, OTPs or pickup credentials. Loqme uses phone/OTP authentication and does not have retrievable static passwords. The admin settings screen is oversight, not impersonation.

Account edits and owner assignment use a serializable transaction with an expected-owner concurrency check and an audit record in the same transaction. An independent owner cannot already belong to another store or be an admin/inactive account. Shared legacy owners must be separated before editing their account. Reassignment removes the previous owner's staff membership for that store. Disabling an owner blocks OTP verification, session discovery, merchant APIs and pickup verification through live active-user checks. No existing store accounts are automatically reassigned by this checkpoint.

The root session provider stores only public account metadata in React memory; credentials remain in the existing HttpOnly cookie. Unknown session state is not rendered as logout. Network failures preserve a previously known state, while successful session refresh reflects current database role/status. This UI cache is not an authorization decision. Docker Compose mounts persistent listing-image volumes, owned by the unprivileged runtime user.

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

CP-10.11 implementation note (2026-09-21): the actual login routes are `/api/auth/request-otp` and `/api/auth/verify-otp`. Login codes expire after 120 seconds and now allow at most five verification attempts per latest code, enforced by atomic PostgreSQL conditional updates. Consumption is single-use under concurrency. Database failure fails closed; production user lookup cannot return offline demo identities. The existing send limit is per-process 3 requests/10 minutes; the older 15-minute login lockout statement below is a policy target, not implemented behavior. Live SMS and distributed throttling remain launch gates.

Business APIs recheck active users and admin roles against the DB. Ownership and commission are server-derived, strict DTOs reject forged state, and approval plus audit is atomic. Map.ir credentials remain in server headers; stream limits and 8-second timeouts bound provider requests. Business pages/API responses bypass caches and indexing. See [AUTH_ONBOARDING.md](AUTH_ONBOARDING.md) for exact limits and scope.

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

## CP-11.9 regression repairs (2026-10-03, release pending)

Order/reservation detail and pickup credentials require authenticated ownership; missing customer profiles cannot disable scoping. Public review queries omit customer phone numbers, customer IDs and private order identifiers. Login OTP consumption requires both unexpired `expiresAt` and issuance within 120 seconds, invalidating legacy long-lived codes as well as new expired codes.

Production checkout selects Zarinpal on the server; mock and unsupported gateway resolution fail closed. Payment verification rechecks state under a payment-row lock so delayed failures cannot replace success/refunds. Order completion locks its order and commits reservation conversion, inventory, ledger and savings together. Pickup requires customer proof and an eligible paid order; consuming proof and completing the order share a transaction. No-show mutation requires a session and conditionally rechecks order eligibility. Refund processing supports full refunds only and rejects adapters without a real refund operation. These changes have regression tests; coverage work and operational release gates remain open. See `TEST_COVERAGE_AUDIT.md` for current evidence and limitations.

Refund requests now claim a REQUESTED refund under a payment-row lock before external transfer. Concurrent/repeated requests cannot issue another transfer while a non-rejected claim exists. Only an explicit provider rejection permits a new attempt. Exceptions or failed local finalization retain the claim for operator/provider reconciliation; do not delete it or retry blindly. CSV exports escape delimiters and neutralize formula-leading user text. Merchant staff invitations update customer-to-staff role and membership atomically without changing existing owner/admin roles.
# M12 implementation note — 2026-10-13

[Merchant data authority and recovery](MERCHANT_DATA.md) documents live administrator/membership checks, owner-only scoped reports, manager-only listing writes, bounded bodies/origin checks, durable uncertain payment attempts and evidence-gated reconciliation. Report JSON contains decimal money strings and no customer identity/provider payload. Unknown provider outcomes never authorize an automatic second money transfer.

## CP-12.6 PostgreSQL RLS — 2026-10-22

[DATABASE_RLS.md](DATABASE_RLS.md) is the implementation and rollout contract. All 34 model tables have ENABLE/FORCE policies; the web runtime uses a non-owner, NOBYPASSRLS login. Every query receives transaction-local verified identity, and policies resolve active roles and memberships from live database rows. Narrow server-only service contexts support authentication, callbacks, reservations/expiry, invitations and moderation without a general runtime bypass. A NOLOGIN read-only helper role handles policy recursion and financial integrity checks. Existing backend authorization, DTO projections, financial validation and immutable history remain required.

RLS limits rows, not fields within an allowed row, and trusts the backend's context binding. It does not authenticate arbitrary SQL clients or protect against stolen runtime credentials/SQL injection. Never expose context setters to clients or pass migration credentials to the production web process. The implementation passed 20 dedicated real PostgreSQL RLS acceptance tests within a complete 1,010-test run; it has not been deployed to production.
