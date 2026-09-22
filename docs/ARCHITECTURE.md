# Technical Architecture Specification — Loqme (لقمه)

> **Preferred Greenfield Architecture**: Next.js (App Router), React, TypeScript, PostgreSQL, PostGIS  
> **Key Directives**: Monolithic elegance, clean domain service boundaries, zero unnecessary microservices, zero unjustified separate .NET backends for MVP.

---

## 1. System Overview & Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|   Next.js App Router (PWA / Mobile Responsive / RTL / Persian Typography)         |
|   Server Components (SSR / SEO)  |  Client Components (Interactive UX / Maps)     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                             APPLICATION & API LAYER                               |
|   Next.js Route Handlers & Server Actions  |  Zod Request Validation              |
|   Session & Cookie Auth Middleware (RBAC: Customer, Merchant, Admin)              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                               DOMAIN SERVICE LAYER                                |
|  - ListingService      - InventoryService (Atomic Locks)  - OrderService          |
|  - PaymentService      - PickupVerificationService        - ModerationService     |
|  - SettlementService   - AnalyticsService                 - NotificationService   |
+-----------------------------------------------------------------------------------+
        |                                                   |
        v                                                   v
+-----------------------------+        +--------------------------------------------+
|   REPOSITORY & DATA ACCESS  |        |          INTEGRATION ADAPTERS              |
|   Prisma / Drizzle ORM      |        |  - Payment: Saman, Zarinpal, MockGateway   |
|   PostgreSQL + PostGIS      |        |  - SMS: SMS.ir, ConsoleMock                |
|   (Geospatial & ACID Locks) |        |  - Maps: Neshan, Cedarmaps, Leaflet        |
+-----------------------------+        |  - Storage: ArvanCloud / Liara S3, Local   |
                                       +--------------------------------------------+
```

---

## 2. Layered Responsibilities

### 2.1 Presentation & Client Layer (Next.js App Router)
* **Server Components (RSC)**: Used by default for all public discovery pages (home, search, category browsing, merchant profiles) to guarantee blazing fast server-rendered HTML and instant search engine indexability.
* **Client Components**: Isolated strictly to interactive leaves (e.g. map pins, live reservation timer, checkout button, QR scanner, camera upload).
* **State Management**: Lightweight URL state (`nuqs` / query params) for search filters; React Context / Zustand for checkout and session state.

### 2.2 Application & Routing Layer
* **Route Handlers (`/api/*`) & Server Actions**: Secure endpoints handling business mutations.
* **Input Validation**: Strictly validated using `Zod` schemas before touching any domain logic.
* **Separation of Concerns**: Business logic is never embedded directly inside UI components or raw route handler files. Route handlers delegate immediately to Domain Services.

### 2.3 Domain Service Layer
Pure TypeScript domain services encapsulating all core business rules:
* `ListingService`: Validates price baselines, discount thresholds, and pickup window validity.
* `InventoryService`: Manages atomic reservation locks and releases expired holds.
* `OrderService`: Governs the order state machine (`PENDING_PAYMENT` → `PAID` → `READY_FOR_PICKUP` → `COMPLETED`).
* `PaymentService`: Coordinates gateway redirection, webhook verification, and idempotency tracking.
* `PickupService`: Generates time-sensitive QR hashes and 4-digit OTPs, and executes atomic verification handshakes.
* `ModerationService`: Manages merchant safety reviews, complaint lifecycles, and listing suspensions.
* `SettlementService`: Calculates commission splits and merchant net payout balances.

### 2.4 Data Access & Repository Layer
* **Database**: PostgreSQL 15+ with `PostGIS` extension enabled.
* **Spatial Capabilities**: Geospatial index (`GIST`) on merchant locations for sub-millisecond radius search:
  ```sql
  SELECT * FROM "MerchantLocation"
  WHERE ST_DWithin(geom, ST_MakePoint(:lng, :lat)::geography, :radiusMeters)
  ORDER BY ST_Distance(geom, ST_MakePoint(:lng, :lat)::geography) ASC;
  ```
* **ORM**: Prisma ORM with type-safe schema definitions, relational constraints, and migration scripts.

---

## 3. External Integration Abstractions

To isolate the codebase from third-party vendor volatility and facilitate local development and automated testing, all external boundaries use clean adapter interfaces:

### 3.1 Payment Gateway Abstraction (`IPaymentGateway`)
```typescript
export interface IPaymentGateway {
  requestPayment(params: {
    orderId: string;
    amountToman: number;
    callbackUrl: string;
    mobile: string;
  }): Promise<{ paymentUrl: string; authority: string }>;

  verifyPayment(params: {
    authority: string;
    amountToman: number;
  }): Promise<{ isSuccessful: boolean; referenceId: string; trackingCode: string }>;

  refundPayment?(params: {
    referenceId: string;
    amountToman: number;
  }): Promise<{ isSuccessful: boolean; refundId: string }>;
}
```
* Adapters: `MockPaymentGateway` (for dev & E2E tests), `ZarinpalGatewayAdapter`, `SamanGatewayAdapter`.

### 3.2 Notification & SMS Abstraction (`INotificationService`)
```typescript
export interface INotificationService {
  sendOtp(mobile: string, code: string): Promise<boolean>;
  sendOrderConfirmation(mobile: string, orderNumber: string, pickupWindow: string): Promise<boolean>;
  sendPickupReminder(mobile: string, orderNumber: string, remainingMinutes: number): Promise<boolean>;
}
```
* Adapters: `ConsoleMockNotificationService` (dev), `SmsIrNotificationService` (production).

### 3.3 Map & Geocoding Abstraction (`IMapService`)
* Map rendering: OpenStreetMap tiles or Iranian map provider (Neshan / Cedarmaps) via Leaflet.
* Geocoding: Reverse geocoding of user coordinates into Persian address snippets.

### 3.4 Storage Abstraction (`IStorageService`)
* Adapters: `LocalStorageService` (uploads to local `/public/uploads` in dev), `S3StorageService` (ArvanCloud / Liara S3-compatible buckets in production).

---

## 4. Progressive Web App (PWA) & Mobile Experience

* **Manifest**: Web App Manifest configured for standalone display, Persian name (`لقمه`), and brand theme color (`#F97316`).
* **Service Worker**: Cache static assets (Vazirmatn fonts, logos, core icons) for instant load on intermittent mobile connections.
* **Ergonomics**: Mobile bottom navigation bar, swipeable cards, haptic feedback on QR scan.

---

## 5. SEO & Structured Data

* **Server-Side Rendered Metadata**: Dynamic Open Graph and Twitter card tags generated per merchant and listing.
* **JSON-LD Schema**:
  * `Schema.org/LocalBusiness` on merchant profile pages.
  * `Schema.org/Product` and `Schema.org/Offer` on listing pages with Persian currency and availability.
* **Sitemap**: Automated XML sitemap generation (`/sitemap.xml`) indexing active cities, neighborhoods, and verified merchants.

---

## 6. Testing Strategy

* **Unit Testing**: Vitest for pure domain logic, price calculations, commission rules, and safety state machines.
* **Integration Testing**: Testing repository database interactions, PostGIS queries, and atomic inventory locks using a local test PostgreSQL instance.
* **Concurrency Testing**: Multi-threaded checkout test simulating 10 concurrent requests reserving the last remaining Surprise Bag to guarantee zero overselling.
* **E2E Testing**: Playwright tests executing the complete loop: Discover → Reserve → Pay (Mock) → Pick Up (OTP Verification).

---

## 7. Deployment & Infrastructure

* **Containerization**: Multi-stage `Dockerfile` producing a lightweight Node.js Alpine production container.
* **Hosting**: Compatible with standard container platforms (ArvanCloud Container, Liara PaaS, Docker Compose on Linux VPS).
* **Database**: Managed PostgreSQL with PostGIS or containerized instance with automated daily backups.
