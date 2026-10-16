> **Plan ID: LQ-MDAI-001**
> **Approved for incremental implementation:** 2026-10-13 by the project owner.
> **Execution tracker:** [M12 — Merchant data foundation](../milestones/M12-merchant-data.md).
> The audit below is the original design baseline. Its planning-only restriction describes the earlier audit, superseded by the owner's implementation instruction. External POS, OCR, voice and model-provider gates remain as documented. Check the execution tracker for actual delivery status; the whole roadmap is not marked complete.
# Loqme — Future Merchant Data & AI Infrastructure

Repository audit and implementation plan · 13 October 2026

**Scope: analysis and planning only. No feature implementation is authorized by this report.**

Audited repository: `D:/AiProjects/loqme`, branch `master`, commit `fc0c73bd2b5af8f7b7e3397d00cdc72d04c95a72`. The working tree was clean at the start. This report is saved outside the repository. No packages were installed, migrations applied, production configuration changed, branches changed, commits created, or pushes performed.

Evidence comes from source, schema, migrations, tests, configuration, and repository documentation. No live database, deployment, PSP, terminal, or merchant dataset was inspected. Statements about missing capabilities mean **not found in the inspected repository**. Proposed entities, files, interfaces, targets, and policies below are explicitly future work.

## 1. Executive summary

**Loqme can support useful marketplace-only merchant reporting before a POS or an AI assistant exists. Its current records are not yet a reliable general-purpose merchant operational dataset.**

The application already connects merchants to listings, reservations, orders, payments, pickup verification, refunds, and financial transfers. It has a merchant portal, tenant membership checks, server-side prices, PostgreSQL inventory guards, replay protection for successful order completion, and a provider interface. These are valuable foundations to extend, not replace.

The most important gaps are historical accuracy, explicit store attribution, atomic data capture, consistent authorization, and reconciliation. Listing inventory is a current counter, not an inventory journal. Order items preserve sale prices but read titles, original prices, pickup windows, and other context from mutable listings. Orders have no direct store/location snapshot. Payment initiation is not durably idempotent, and provider verification can succeed while order finalization fails. Existing analytics contain formulas and scope behavior that are unsuitable for direct reuse as merchant AI facts.

Recommended sequence:

1. Establish a shared merchant authorization boundary and explicit merchant/location context; correct existing analytics semantics and payment/reservation failure boundaries.
2. Capture immutable order context, listing revisions, inventory movements, and reconciliable payment outcomes in the same transactions as the business changes.
3. Deliver a small marketplace report with evidence, coverage dates, quality indicators, and honest missing-data states.
4. Add a read-only, evidence-grounded weekly merchant explanation. An LLM is optional for narrative wording; it does not calculate money or decide what data a merchant may access.
5. Evaluate POS and receipt integrations independently, after provider/hardware requirements and data policies are confirmed.
6. Add confirmed natural-language listing changes only after the underlying command, permission, preview, and concurrency contracts are proven.

Keep Next.js route handlers, TypeScript domain modules, Prisma, and PostgreSQL. A PostgreSQL outbox is justified when asynchronous reporting/ingestion begins. A broker, warehouse, vector database, separate AI backend, or new .NET backend is not justified by the evidence gathered here.

**First useful release:** owner-visible marketplace receipts/refunds and listing sell-through, restricted to known data coverage, with no extra daily merchant data-entry form. This is not a total-business sales report, profit report, or measurement of food waste.

Governance requires care: recent status entries and M11 say CP-11.9 remains open, while older tables still say M11 is complete. Roadmap sections also retain initial pending labels. Obtain an explicit new checkpoint for this work before implementation; this audit does not close M11 or supersede its operational gates.

## 2. Repository map and evidence index

References E01–E22 below are used throughout the plan. Links point to the audited checkout. Proposed paths later in the report are not claims that those files exist.

| ID | Existing source | What it establishes |
|---|---|---|
| E01 | [Root manifest](D:/AiProjects/loqme/package.json), [lockfile](D:/AiProjects/loqme/package-lock.json), [web manifest](D:/AiProjects/loqme/apps/web/package.json) | npm workspaces; current dependencies and commands |
| E02 | [Identity schema](D:/AiProjects/loqme/prisma/schema.prisma:135), [MerchantLocation](D:/AiProjects/loqme/prisma/schema.prisma:288) | Users, owners, staff, applications, locations, hours |
| E03 | [Listing schema](D:/AiProjects/loqme/prisma/schema.prisma:341), [core migration](D:/AiProjects/loqme/prisma/migrations/20260906201522_core_domain_entities/migration.sql) | Offers, inventory counters, safety, attributes, PostGIS, checks |
| E04 | [Order/payment schema](D:/AiProjects/loqme/prisma/schema.prisma:468), [financial migration](D:/AiProjects/loqme/prisma/migrations/20260907001800_orders_payments_ledger/migration.sql) | Reservations, items, payments/events, transfer ledger, refunds |
| E05 | [Merchant authorization](D:/AiProjects/loqme/apps/web/src/domain/merchant/merchant.service.ts:185) | Live user role/activity and owner/staff checks; optional minimum staff role |
| E06 | [JWT and transport](D:/AiProjects/loqme/apps/web/src/lib/auth/session.ts), [admin guard](D:/AiProjects/loqme/apps/web/src/lib/auth/admin-auth.ts), [middleware](D:/AiProjects/loqme/apps/web/src/middleware.ts), [logout](D:/AiProjects/loqme/apps/web/src/app/api/auth/logout/route.ts) | Cookie/Bearer JWT; uneven live-account checks; page matcher; cookie-only logout |
| E07 | [Listing creation](D:/AiProjects/loqme/apps/web/src/domain/listing/listing.service.ts:109), [stock adjustment](D:/AiProjects/loqme/apps/web/src/domain/listing/listing.service.ts:310), [merchant listing routes](D:/AiProjects/loqme/apps/web/src/app/api/merchant/listings/route.ts) | Atomic listing provisioning, inventory version check, first-location creation |
| E08 | [Reservations](D:/AiProjects/loqme/apps/web/src/domain/reservation/reservation.service.ts), [inventory](D:/AiProjects/loqme/apps/web/src/domain/inventory/inventory.service.ts) | Ten-minute holds, conditional counters, expiry sweep, release transactions |
| E09 | [Order service](D:/AiProjects/loqme/apps/web/src/domain/order/order.service.ts:41) | Price/commission snapshots, callback completion transaction, live listing reads |
| E10 | [Payment service](D:/AiProjects/loqme/apps/web/src/domain/payment/payment.service.ts), [gateway interface](D:/AiProjects/loqme/apps/web/src/domain/payment/gateway.interface.ts), [Zarinpal adapter](D:/AiProjects/loqme/apps/web/src/domain/payment/zarinpal.gateway.ts) | Implemented gateway behavior, failure boundaries, refund claims, provider payload handling |
| E11 | [Pickup service](D:/AiProjects/loqme/apps/web/src/domain/pickup/pickup.service.ts:559), [no-show route](D:/AiProjects/loqme/apps/web/src/app/api/pickup/no-show/route.ts) | Merchant queue, global sweep, reminder stub |
| E12 | [Merchant dashboard](D:/AiProjects/loqme/apps/web/src/domain/merchant/merchant.service.ts:274), [finance](D:/AiProjects/loqme/apps/web/src/domain/merchant/merchant.service.ts:701), [admin service](D:/AiProjects/loqme/apps/web/src/domain/admin/admin.service.ts) | Current merchant KPIs, historical commission use, settlement reporting |
| E13 | [Analytics service](D:/AiProjects/loqme/apps/web/src/domain/analytics/analytics.service.ts:81), [admin analytics route](D:/AiProjects/loqme/apps/web/src/app/api/admin/analytics/route.ts) | Admin reporting, filters, formulas, CSV generation |
| E14 | [Audit service](D:/AiProjects/loqme/apps/web/src/domain/moderation/audit.service.ts), [AuditLog](D:/AiProjects/loqme/prisma/schema.prisma:690), [moderation](D:/AiProjects/loqme/apps/web/src/domain/moderation/moderation.service.ts) | Audit insert/read API and food-safety actions |
| E15 | [Onboarding service](D:/AiProjects/loqme/apps/web/src/domain/business/application.service.ts), [admin merchant accounts](D:/AiProjects/loqme/apps/web/src/domain/admin/merchant-account.service.ts) | Application revisions, single applicant workflow, transactional admin audit patterns |
| E16 | [Merchant dashboard UI](D:/AiProjects/loqme/apps/web/src/app/(merchant)/merchant/page.tsx), [FastListingModal](D:/AiProjects/loqme/apps/web/src/components/merchant/FastListingModal.tsx) | Polling portal and reusable listing presets, not a product catalog |
| E17 | [Shared types](D:/AiProjects/loqme/packages/types/src/index.ts), [validation](D:/AiProjects/loqme/packages/validation/src/index.ts), [API client](D:/AiProjects/loqme/packages/api/src/index.ts) | Shared contracts, Zod, fetch/error/Bearer transport |
| E18 | [Image storage](D:/AiProjects/loqme/apps/web/src/domain/listing/image-storage.ts), [Map.ir boundary](D:/AiProjects/loqme/apps/web/src/lib/business/mapir.ts), [SMS boundary](D:/AiProjects/loqme/apps/web/src/lib/notifications/index.ts) | Local public photo storage, bounded provider requests, SMS adapter selection |
| E19 | [Config](D:/AiProjects/loqme/apps/web/src/core/config.ts), [Prisma client](D:/AiProjects/loqme/apps/web/src/lib/prisma.ts), [logger](D:/AiProjects/loqme/apps/web/src/lib/logger.ts), [Next config](D:/AiProjects/loqme/apps/web/next.config.mjs) | Runtime config, database connection, structured redaction, headers |
| E20 | [Dockerfile](D:/AiProjects/loqme/Dockerfile), [production Compose](D:/AiProjects/loqme/docker-compose.prod.yml), [local Compose](D:/AiProjects/loqme/docker-compose.yml), [deployment workflow](D:/AiProjects/loqme/.github/workflows/deploy.yml), [backup script](D:/AiProjects/loqme/scripts/backup-db.sh) | Deployment topology, release validation, backup/migration/rollback ordering |
| E21 | [Vitest config](D:/AiProjects/loqme/vitest.config.ts), [Playwright config](D:/AiProjects/loqme/playwright.config.ts), [coverage audit](D:/AiProjects/loqme/docs/TEST_COVERAGE_AUDIT.md), [payment concurrency tests](D:/AiProjects/loqme/tests/payment-concurrency.integration.test.ts) | Test conventions, coverage gates, disposable database protections |
| E22 | [AGENTS](D:/AiProjects/loqme/AGENTS.md), [status](D:/AiProjects/loqme/docs/PROJECT_STATUS.md), [roadmap](D:/AiProjects/loqme/docs/ROADMAP.md), [M11](D:/AiProjects/loqme/docs/milestones/M11-production.md), [architecture](D:/AiProjects/loqme/docs/ARCHITECTURE.md), [food safety](D:/AiProjects/loqme/docs/FOOD_SAFETY.md) | Product, authority, milestone and safety constraints; some historical documentation drift |

### Verified stack and boundaries

The lockfile resolves **Next 16.3.8, React 19.3.0, Prisma/client 7.10.0, TypeScript 5.9.3, Vitest 5.0.3**. Manifests use ranges such as Next `^16.3.5`. Docker and CI use Node 24. Do not implement this plan against the older Next 14/React 18 target quoted in AGENTS. The web AGENTS file also requires checking the installed Next guides before writing code.

Business logic lives mainly under `apps/web/src/domain`, accessing Prisma directly through `@/lib/prisma`. This is a modular monolith hosted by the web app, not an independently deployed backend or a fully abstract repository layer. Keep server logic there initially. Shared packages should contain portable DTOs, validation, API transport, and tokens, never Prisma credentials, server authorization, or duplicate price authority. The shared API client currently has a guarded `window` check for its default URL; remove that small web assumption when expanding client support instead of claiming strict platform neutrality is already complete.

Production Compose specifies **PostgreSQL 16/PostGIS 3.4**; local Compose specifies **15/3.4**. Redis 7 is provisioned in production, but business event/queue usage was not found; the inspected app uses Redis for a health probe. No installed queue implementation should be inferred from that container. A native Expo application was not found in the inspected app tree; repository release documentation describes an existing Android TWA and a separate future native roadmap. Neither needs alteration for this project.

### API and workflow surface

Existing relevant route families include:

- Public discovery: `/api/listings/{nearby,search}`, `/api/listings/[id]`, `/api/merchants/[id]`, `/api/categories`.
- Checkout: `/api/reservations`, `/api/reservations/[id]`, `/api/orders/checkout`, `/api/orders`, `/api/orders/[id]`, `/api/payments/verify`.
- Merchant: `/api/merchant/{dashboard,listings,settings,staff,finance}`, `/api/merchant/listings/[id]`, `/api/merchant/pickup/queue`.
- Pickup/moderation: `/api/pickup/{verify,no-show}`, `/api/pickup/credentials/[orderId]`, reviews and complaints routes.
- Onboarding/admin: `/api/business/application`, `/api/admin/merchant-applications`, merchant account, safety, audit, finance/settlements, analytics and export routes.

Merchant UI pages already cover overview, listings, orders, settings, staff and finance. FastListingModal supplies presets and publishes a Surprise Bag. The generic listing service supports both listing enums, but the current fast merchant POST explicitly chooses `SURPRISE_BAG`. Its PATCH supports stock/status/photo/pickup instructions; a general price/title editing command was not found there. Natural-language price changes therefore need a real new validated domain command, not just a wrapper around this PATCH.

No `use server` business-action implementation or durable domain event/outbox processor was found in the inspected source. Reservation cleanup runs on demand, including discovery requests; no-show cleanup runs from the merchant queue and a POST endpoint. A deployed recurring business-job schedule was not found in workflows/Compose/scripts. Host-level schedules remain unknown.

## 3. Current-state assessment

### Identity and historical relationships

Existing relationships are:

```text
User --owner--> Merchant --has--> MerchantLocation --has--> MerchantHours
User --membership--> MerchantStaff --belongs to--> Merchant
Merchant --> Listing --> ListingInventory / ListingSafety / ListingAttributes
Listing --optional location--> MerchantLocation
Customer --> Reservation --> Order --> OrderItem --> Listing
Order --> Merchant
Order --> Payment --> PaymentEvent
Order / Payment --> Refund
Order --> FinancialTransaction / PickupVerification / Review / Complaint
```

The schema allows one user to own multiple Merchants and a Merchant to have multiple locations. In practice, `Merchant` is commonly treated as a store. Authorization can accept a merchant ID, but omission selects the first owned/staff Merchant without an explicit ordering or selection contract. Listing creation and settings choose `locations[0]`; order receipts also choose the merchant's first location rather than a captured pickup location. Onboarding has a unique applicant and rejects applicants already associated with a merchant. Thus **multi-store cardinality exists, but end-to-end branch operations are partial**. [E02, E05, E07, E09, E15]

Separate foreign keys validate that a listing's merchant and location exist, but do not enforce that the location belongs to that merchant. OrderItem also has separate order/listing foreign keys without a same-merchant invariant. Existing normal routes derive IDs safely in several places; future ingestion makes database-enforced consistency more important. [E03, E04]

### Operational and financial facts already collected

| Existing data | Reliable use, with conditions | Limits |
|---|---|---|
| Listing title, prices, category, pickup times, attributes, safety | Current offer/availability description | No systematic revision history or first-class product/batch expiry |
| Inventory total/reserved/sold + version | Current listing availability; guarded concurrent mutation | Not total store inventory; no adjustment reasons or historical balance journal |
| Reservation quantity/status/expiry | Holds and their current outcome | Reservation increment and record insertion are separate commits; no durable request key |
| Order and OrderItem monetary snapshots | Agreed checkout amount and commission | Original price, description/category/location/window snapshots are missing |
| Payment authority/status/reference and events | Provider verification evidence, subject to completion/reconciliation | Request is not settlement; raw payload is retained; no general uncertain-outcome state |
| FinancialTransaction | Transfers posted during order completion/refund | Not evidence of actual merchant bank payout; no unique business-posting key |
| Refund record and pending claim | Full-refund workflow and prevention of repeated transfers after uncertainty | Zarinpal adapter has no refund method; unresolved claims require reconciliation |
| PickupVerification | Verified handoff timestamp and actor | Paid and collected are different facts; no-show is not physical waste |
| Reviews/complaints | Verified feedback and operational safety evidence | Not sales inventory, verified spoilage quantities, or objective product demand |

Order completion locks the order, claims the live reservation, converts held stock, writes three transfer rows, and updates savings in one transaction. That is reusable transactional behavior. `PaymentService.verifyPayment` commits provider success separately before order completion. A late payment after reservation expiry correctly does not blindly consume inventory, but leaves a paid/unfulfilled exception for support. [E08–E10]

`createReservation` checks for a prior hold, increments inventory, then inserts Reservation, with a compensating release on caught errors. A process crash between these steps can leave an unlinked hold; concurrent identical requests can pass the prior-hold check. These are **static failure scenarios**, not failures reproduced against a live database in this audit. [E08]

Initiation calls the gateway before persisting Payment, so an accepted request followed by local failure can lack a local record. Reattempting checkout can create another payment authority. Order locking prevents repeated order effects but does not establish that two distinct successful payment attempts are a single collection. This must become a reconciliation case, not another sale. [E09, E10]

### Authorization and security boundaries

`resolveMerchantAndAuthorize` verifies the current database user is active and has a merchant role, then owner/staff membership. Finance requests specify OWNER. However, listing POST/PATCH call this helper without a minimum staff role, so the code does not enforce the documentation's blanket “cashiers only scan pickups” statement. A product-approved permission matrix is necessary before adding AI writes. [E05, E07, E12]

JWTs last 30 days; cookie and Bearer transports are available. The Session table exists but issuance/revocation through it was not found. Logout clears the cookie. The shared admin guard checks the JWT role without reloading current role/activity; newer onboarding and merchant-account services perform additional live checks. Do not assume all routes revoke access immediately after a role change. Middleware's matcher covers protected pages, not `/api/*`; API handlers must enforce authorization themselves. [E06, E15]

The no-show endpoint accepts any valid non-customer token and invokes a global sweep returning affected order IDs. It does not apply merchant membership scope. The merchant queue also invokes a global sweep internally. This is a concrete tenant/operational boundary to correct before reusing these functions in jobs or AI tools. No database row-level security policies were found in migrations; tenant isolation currently depends on application checks. [E11]

### Analytics: useful starting point, unsafe as a fact API without repairs

Merchant finance and dashboard sum saved order commission/payout amounts. The separate `AnalyticsService` still recalculates commission from the merchant's **current** rate and uses `|| 10`, which substitutes 10 for a real zero. It also uses current listing prices for savings. Historical reporting therefore differs between code paths. [E12, E13]

Additional observed semantics:

- Orders/listings are selected by `createdAt`; paid date, pickup cohort, and refund date are not separate metric time axes.
- Refund selection includes APPROVED and SETTLED; approval must not become proof of cash refunded.
- Sell-through uses the larger of order quantity and inventory-sold quantity, across potentially different cohorts, and clamps to 100%. This can hide inconsistency.
- Both 14-day and 30-day repeat fields receive the same in-range repeat percentage.
- `cityId` is accepted by the route but not used by the analytics service. The neighborhood and total-customer queries remain global even when `merchantId` filters orders/listings.
- Neighborhood aggregation attributes a merchant's orders to each location; multi-location merchants can be counted repeatedly. The “unmet demand” score includes a hard-coded heuristic.
- “TODAY” uses host-local time while daily keys use UTC. Listing time parsing has an Asia/Tehran helper, but analytics does not consistently use Tehran business-day boundaries.
- Merchant finance excludes NO_SHOW/REFUNDED orders from its gross summary while admin analytics includes them in paid cohorts. No-show recognition and refunds need named, consistent metrics.

These are source-level findings. The analytics endpoint is currently admin-only; the global aggregates are **not a claim of an existing merchant-facing leak through that endpoint**. Exposing this service to merchants without refactoring would create that risk.

### Audit, integrations and operations

AuditService inserts AuditLog rows with actor/entity/details. It has no transaction-client parameter; several callers log separately after a mutation. Some newer services insert audit records inside their own transaction. Database append-only enforcement or cryptographic tamper evidence was not found; comments calling logs immutable are not sufficient. Listing/stock operations have no systematic revision or movement audit. [E07, E14, E15]

The payment enum names MOCK, ZARINPAL, SAMAN and SADAD, but only MOCK and ZARINPAL adapters are resolved; MOCK is rejected in production. Zarinpal verification sends a server-selected amount and accepts provider success codes only with successful HTTP responses. It maps `card_pan` to trackingCode and stores provider JSON via PaymentEvent. This is not evidence that raw full card numbers are stored, but is unnecessary card-derived data to remove from future reports/AI and review at the persistence boundary. Gateway health only resolves an adapter; it does not perform a provider connectivity test. [E10]

SMS.ir and Map.ir boundaries exist. Listing photos are public local files with decoding/size checks, not private document storage. SENTRY_DSN appears in configuration; an active error-reporting SDK integration was not found. Structured logging redacts object fields, but direct console calls bypass it and free-text messages/errors are not generally scrubbed. Pickup reminders currently log a phone number and mark reminderSentAt; that method does not call the notification adapter, and a scheduler caller was not found. [E11, E18, E19]

Deployment CI uses a disposable PostGIS database, migrations, seeding and ordinary tests, then builds a container. Production deployment stages configuration, backs up and checks the dump, migrates before app replacement, and probes readiness. App rollback retains the compatible migration. A checksum/archive-list check is not a database restore drill. The backup script compresses/checksums/prunes locally; offsite encryption and an installed daily schedule were not established by this inspection. [E20, E21]

## 4. Gap analysis and priority

“First” means part of the first approved implementation phase, not authorization to implement today. “Prepare” means establish a contract without building the future feature.

| Capability | Reuse | Gap and proposed response | Security/operations and dependencies | Priority |
|---|---|---|---|---|
| Merchant/store identity | Merchant, MerchantLocation, membership [E02/E05] | Explicit context; same-merchant composite constraints; order location snapshot | Decide whether locations are operational branches; avoid automatic organization merge | First; full branch UI later |
| Historical offer facts | Listing/OrderItem [E03/E09] | Listing revision and checkout snapshots; immutable event times | Do not label copied present-day values historical facts | First |
| Inventory history | Counters, SQL checks, versions [E03/E08] | Transactional movement journal; initial baseline; reason codes | All writers, including raw SQL and moderation paths, must be covered | First |
| Payment reliability | Verification locks, refund claim [E10] | Durable initiation attempt, explicit UNKNOWN, accepted payment link, reconciliation cases | No blind retry of a debit/refund; distinguish verified cash and fulfillment | First |
| Tenant permissions | Merchant helper, OWNER finance [E05/E06] | Central action-based authorization; live admin checks; job isolation | No-show route and AI/ingestion queries require fresh scope checks | First |
| Trusted analytics | Order snapshots, ledger, reports [E12/E13] | Shared metric definitions and scoped queries; source evidence and quality | Repair formulas, date axes, filter scope before AI reuse | First/Phase 2 |
| Source-aware capture | PaymentEvent, AuditLog [E04/E14] | Minimal provenance on core records; outbox and ingestion receipts when needed | Distinguish source assurance from estimated/inferred values | Prepare now; build Phase 2 |
| Stable product identity | Category, presets [E03/E16] | Optional MerchantProduct and mappings only for repeated product-level use | A bag does not imply known ingredient/SKU contents | Prepare; add when justified |
| Whole-store inventory/expiry | ListingSafety only [E03] | Product stock/batches and movements are separate future concepts | Pickup expiry is not food expiry; no AI safety certification | Defer to validated use case |
| POS | Payment interface pattern [E10] | Separate terminal adapter, device identity, staged external sale | Provider/SDK/hardware/verification authority unknown | Defer; contract now |
| Receipts/invoices | Image validation pattern [E18] | Private documents, extraction candidates, review/linking | Invoice is not proof of payment; duplicate online/POS receipt must link | Defer; contract now |
| AI assistance | Existing domain commands and UI [E07/E16] | Read-only insight service, then review/confirm proposals | No direct Prisma/SQL or financial tools; untrusted text/OCR | Phase 3; writes Phase 5 |
| Durable background work | PostgreSQL transactions, deployment [E08/E20] | Same-codebase worker with outbox leases, retries, dead letters | Existing Redis does not require introducing a queue | Phase 2 |

## 5. Recommended target architecture

```text
Web / future native client / future authorized integration
             |
Next.js route: authenticate + bounded validation + explicit scope
             |
Merchant access service ---> action permission + location ownership
             |
Domain commands: Listing / Inventory / Order / Payment / Reconciliation
             |
PostgreSQL transaction
  existing authoritative records + snapshots/revisions/movements
  + actor/source audit + outbox event (when async consumers exist)
             |
Same-repository worker ---> idempotent projections / quality checks
             |
MerchantReportingService ---> authorized facts + provenance + coverage
             |
MerchantInsightService ---> optional model narration of those facts
             |
Later: proposal preview ---> explicit confirmation ---> same domain command

Later POS and receipt adapters ---> staged ingestion ---> validation/reconciliation
                                ---> canonical accepted operational records
```

### Responsibilities and design choices

**Authorization is an input to services, not a model-supplied filter.** Introduce a server-constructed `MerchantContext` from authenticated identity, current role/activity, Merchant membership, requested location and action. Load the resource within that scope. Recheck permissions and revision in the mutation transaction. A caller-supplied merchant ID selects a candidate context; it never grants access. Start finance/insights as OWNER-only to preserve current finance expectations until the owner approves manager permissions. Restrict global jobs to a dedicated internal worker entry point. [E05, E06, E11]

**Reuse current orders as marketplace sales facts.** Do not create a second writable Sale row for every marketplace order in Phase 1. A reporting service can derive marketplace sales from completed financial postings, accepted verified payments, order items and settled refunds, while preserving fulfillment separately. Add external sale entities only when external ingestion is approved. This avoids two systems claiming authority over the same order. [E04, E09]

**Synchronously commit critical effects; defer only projections.** Financial posting and inventory effects stay in the existing transaction. No outbox consumer is responsible for reserving stock or deciding payment success. Append revisions/movements/audit in that transaction. In Phase 2, an OutboxEvent in the same transaction triggers asynchronous reports or integration work. Use a PostgreSQL lease/claim mechanism and idempotent consumers; a Node worker from the same repository and image is sufficient. [E08–E10, E20]

**Begin with bounded SQL aggregation.** Use explicit scopes, indexed merchant/time queries, and shared metric definitions. Add daily summaries only after query plans and measured latency show a need. Summaries must be disposable and rebuildable, with a watermark and metric version. A warehouse and vector database provide no immediate value for these structured facts. [E12, E13]

**Preserve multi-client boundaries without a rewrite.** New DTOs/Zod schemas go into the shared packages and are re-exported from their indexes; server services stay under `apps/web/src/domain`. The future worker must package/import those modules correctly: the standalone app image does not automatically provide a new unbundled TypeScript worker entry point. Prefer an explicit built worker entry and existing runtime/build tools, tested in the container. [E01, E17, E20]

**Separate connection health, source authenticity and business truth.** A valid device credential establishes which integration sent a record, not that a bank approved it. Merchant confirmation establishes a declared stock count, not audited physical inventory. OCR confidence establishes extraction confidence, not proof of payment or safety. AI assertions are stored separately from canonical records.

### Metric contract before implementation

Use an explicit metric version and half-open interval `[from, to)`, with stored instants in UTC and business-day bucketing in `Asia/Tehran`; Jalali/Persian formatting belongs in presentation.

| Metric | Definition proposed for approval |
|---|---|
| Confirmed customer collections | Accepted, server-verified payments counted once by verification time; separately show verified payments not allocated to a fulfillable order |
| Marketplace fulfilled-order sales | Accepted paid order amount, with fulfillment dimensions PAID/READY/COMPLETED/NO_SHOW separate; no-show commercial recognition policy must be approved |
| Confirmed refunds | SETTLED refund amount by settlement time; APPROVED/REQUESTED are pending amounts |
| Net customer collections | Confirmed collections minus confirmed refunds in the period; retain negative results rather than clamping |
| Commission / merchant accrual | Saved order allocations and actual reversal postings, not current merchant rates; never label accrual as a bank payout |
| Listing sell-through | Confirmed units / offered units for the same closed pickup cohort, using recorded additions/withdrawals and explicit adjustment rules; exclude invalid/unknown denominators |
| Remaining listing allocation | Current total minus sold minus held; distinct from final unsold units or physical stock |
| Pickup completion | Verified pickups / eligible paid orders with closed pickup windows; exclude still-open windows from completed-cohort ratios |
| Repeated leftovers | Only “remaining marketplace allocation” for comparable, complete listing cohorts; do not claim total business waste |
| Product performance | Only explicitly mapped stable products; otherwise label listing/category performance |

Return `null` plus a reason for an unavailable metric; zero means an observed zero. Show sample size, coverage start, exclusions, latest accepted event time and reconciliation backlog. Do not combine incompatible cohorts to make percentages look complete.

## 6. Proposed data model and integrity rules

All additions in this section are **proposals**. Implement only the entities required by the approved phase.

### Phase 1: extend the authoritative marketplace

| Proposal | Fields/relationships and purpose |
|---|---|
| Explicit location attribution | Keep Merchant and MerchantLocation IDs. Add `Order.merchantLocationId` and captured pickup address/window; require a known valid location for new branch-attributed orders. Legacy nulls remain visibly unknown. Add same-merchant constraints for listing/location and order/items using composite unique keys/FKs or carefully scoped SQL constraints. Archive referenced locations rather than deleting history. |
| OrderItem snapshots | Capture title, category ID/name, original price, sold unit price, listing revision and pickup window at checkout. Existing unitPrice/subtotal remain authoritative. Store `snapshotOrigin` and capture time so legacy backfills cannot masquerade as contemporaneous snapshots. |
| ListingRevision | `id, merchantId, locationId, listingId, revision, capturedAt, actorId, sourceKind, commandId, reasonCode`, bounded canonical offer fields. Unique `(listingId, revision)`. Add Listing revision for compare-and-set. Record creation and material changes, including safety/status. Keep high-frequency reservation movements in the journal, not giant duplicated revision JSON. |
| ListingInventoryMovement | `id, merchantId, locationId?, listingId, inventoryVersion, kind, deltaTotal, deltaReserved, deltaSold, resultingTotal/reserved/sold, occurredAt, recordedAt, actorId?, operationKey, reservationId?, orderItemId?, reasonCode, sourceKind`. Unique listing/version and stable operation effect key. Opening baseline is a special record, not a fabricated historical event. |
| OperationReceipt | For retriable hold/listing/stock commands: authenticated principal, server-derived tenant/resource scope, action, idempotency key, canonical request hash, state, stable result reference and timestamps. Unique `(principalId, scopeKey, action, idempotencyKey)`. Commit the receipt result with the mutation; an in-progress retry cannot execute again. PaymentAttempt owns the separate external-provider lifecycle. Retain business-effect uniqueness even after response-cache retention expires. |
| PaymentAttempt | `id, orderId, requestKey, requestHash, provider, state, requestedAmountToman, providerAuthority?, initiatedAt, verifiedAt?, lastCheckedAt?, safeFailureCode`. Unique `(orderId, requestKey)` and unique provider/authority when known. Persist before contacting provider; retain UNKNOWN after ambiguous response. Link existing Payment when authority is known. |
| Accepted payment link | Nullable `Order.acceptedPaymentId`, unique, validated to reference the same order and amount; only one accepted funding attempt. A second verified payment creates a reconciliation exception. It must not cause a second inventory or ledger effect. |
| ReconciliationCase | Typed subject FK to payment attempt/payment/refund as appropriate, merchant/order scope, reason, state OPEN/IN_REVIEW/RESOLVED, safe evidence reference, assigned actor, resolution and timestamps. Cases include late verified payment, duplicate successful attempt, amount mismatch, unknown refund, and ledger/stock mismatch. |
| Audit/ledger extensions | Add tenant/location/correlation/source context to AuditLog; allow a transaction client in AuditService. Add a unique financial posting business key and event timestamps. Enforce application-role append-only access to journals/posted transfers with a separate migration/maintenance role; design retention before delete restrictions. |

A merchant ID redundantly stored on a child record is useful for scoped indexes but must be checked against its parent. Do not add denormalized scope columns without cross-record consistency enforcement. Entity creation/import must validate that OrderItem, Listing, Location and Order all belong to the resolved tenant. RLS can be evaluated as defense in depth later; it is not a substitute for service authorization or something to introduce without testing Prisma pooling and worker sessions.

Inventory movement examples:

```text
OPENING_BASELINE: resulting counters captured at cutover; prior history unknown
RESERVE:          deltaReserved +q, tied to Reservation
RELEASE/EXPIRE:   deltaReserved -q, tied to that Reservation
CONFIRM_SOLD:     deltaReserved -q, deltaSold +q, tied to OrderItem
ADJUST_ALLOCATION: deltaTotal +/-q with reason and actor
```

Every counter change and movement must commit together. New movement version equals the committed inventory version. Corrections append reversal/correction records with links; they do not rewrite prior entries. Refund does **not** automatically return food to saleable inventory. Physical return, food safety, available allocation and money reversal are separate operations. Listing allocation must not later be silently reused as product on-hand stock.

Atomic hold creation needs a transaction-capable `atomicReserve(tx, ...)`, a durable request key and a database-enforced active-hold rule. If adopting one PENDING reservation per customer/listing, sweep/claim expired rows in the same transaction before insertion; a partial index cannot use a moving `now()` predicate. Existing duplicate pending holds require an explicit reconciliation migration, not automatic destructive merging.

Payment state proposal at the adapter boundary:

```text
CREATED -> SUBMITTING -> AWAITING_VERIFICATION -> VERIFIED
                    \-> UNKNOWN -> verified inquiry -> VERIFIED / DECLINED
                    \-> DECLINED (only authoritative rejection)
VERIFIED -> allocated to one order OR RECONCILIATION_REQUIRED
```

Keep verification and order allocation separate. Do not change existing Payment enums blindly during rolling deployment: introduce PaymentAttempt first, adapt readers, backfill known attempts, and migrate status semantics only when both old/new consumers are compatible. A thrown exception and a provider's definitive rejection must be different results. The current boolean gateway interface cannot express this adequately.

### Phase 2: source-aware asynchronous processing

| Proposal | Minimum design |
|---|---|
| OutboxEvent | ID, tenant/location, type, schemaVersion, aggregate ID/version, occurredAt/recordedAt, minimal allowlisted payload, causation/correlation ID, availableAt, attempts, lease owner/expiry, delivered/dead-letter timestamps. Write in the business transaction. |
| EventConsumption | Unique `(consumerName, eventId)` plus processed time, committed in the same transaction as a projection. Do not assume delivered transport means effects were committed. |
| IngestionReceipt | Introduce when the first importer is built: tenant/source connection, externalRecordId/version, event type, payload hash, source time, received time, state, typed canonical target reference, validation issues and retry metadata. Unique `(connectionId, externalRecordId, externalVersion, eventType)`. Do not expose a general external ingestion endpoint before a real adapter exists. |
| DailyMerchantMetric, optional | Tenant/location/businessDate/metricVersion composite identity, exact aggregates, computation time and covered event watermark. Derived and rebuildable, never authoritative financial state. |
| MerchantProduct, conditional | Stable merchant-scoped product ID, name, category, unit, optional merchant SKU, active state; tenant-unique SKU when present. Add only after approving recurring product reporting. A listing can optionally reference a product; mixed bags remain unmapped unless composition is explicitly known. |

Provenance must separate `sourceKind` (MARKETPLACE, MERCHANT_DECLARATION, POS, RECEIPT), `verificationStatus` (UNVERIFIED, SOURCE_VERIFIED, MERCHANT_CONFIRMED, RECONCILED, DISPUTED) and `valueKind` (OBSERVED, DERIVED, ESTIMATED, AI_INFERRED). Define the verified claim: a verified payment amount does not verify the associated product name or physical stock. Retain field-level evidence where sources disagree, and `supersedes` links for corrections. A confidence score is supplementary, never authority to post money or inventory.

### Later entities, intentionally deferred

- **ExternalSale / ExternalSaleLine:** tenant/location/source connection, external sale identity, occurred/received/verified timestamps, immutable line/price/quantity snapshots, payment verification state, return/void links. Do not force external sales into customer Reservation/Order because walk-in sales need not have a Loqme customer or pickup window.
- **ExternalPaymentEvidence:** typed provider/terminal reference, amount/currency, verification authority/method/time and reconciliation state. Unique reference within the documented provider/terminal scope; do not assume references are globally unique.
- **IntegrationConnection / IntegrationDevice:** tenant/location grants, adapter and capability version, credential reference, revocation and synchronization state. Server determines these scopes from credentials.
- **ProductBatch / StockMovement / ListingStockAllocation:** only when real stock tracking is commissioned. Track product units, batch/date provenance, on-hand changes, locations and allocation to listings. Require explicit reconciliation of POS stock versus reserved marketplace allocation to prevent double subtraction or overselling.
- **ImportedDocument / ExtractionCandidate / DocumentLink:** private object key, hash, tenant, document kind, receipt/invoice identifier, received time, retention deadline, extraction version, field confidence and review status; link to an existing order/sale/payment before creating a new fact.
- **InsightRun / ActionProposal:** input evidence IDs/watermark, rule/model version, generated explanation, value-kind labels, validity period; proposal has canonical action payload/hash, expected revisions, creating actor and confirming actor, result ID and state. Conversations are optional short-retention inputs, not an indefinite training dataset.

### Deduplication, validation and monetary representation

Exact retries with the same scoped key and canonical payload hash return the original result. Same key/different content yields 409; never overwrite silently. Corrections use an explicit external version or superseding record. Fuzzy receipt matching creates a review candidate; it must not discard a legitimate same-amount sale. POS and OCR evidence of a Loqme order attach to that order rather than double-count it as an external sale.

Keep integer Toman amounts in BigInt internally. For new APIs serialize money as decimal strings with explicit `currency: "IRT"`; validate safe quantities and bounds. Leave existing number-based DTOs backward compatible until versioned replacement. Rial/Toman conversion belongs in each verified adapter contract with tests; the current Zarinpal request uses IRT, which says nothing about terminal units. Weighted products require an approved Decimal/unit model rather than repurposing integer bag quantities.

## 7. Prioritized implementation roadmap

### Phase 0 — Audit and decisions (this deliverable)

**Objective:** establish code-level truth and an actionable plan. **Scope:** this report and limited non-database regression execution. **Schema/API changes:** none. **Dependencies:** repository access only. **Security:** no environment values copied; no live provider calls. **Done:** evidence map, risks, phased contracts, migration strategy and handoff delivered. Approval of future phases remains outstanding.

### Phase 1 — Trustworthy marketplace records

Implement in three reviewable checkpoints:

1. **P1a — Authority and metric specification:** choose merchant/location semantics and action permissions; centralize live-user scope checks; close global no-show access and stale admin authorization. Define report formulas and timestamps. Add the new milestone documentation only when implementation is authorized.
2. **P1b — Transaction integrity:** make hold creation atomic/idempotent; add initiation-attempt persistence and UNKNOWN classification; implement explicit reconciliation cases and a minimal owner/admin-safe operations view. Correct missing reference/amount handling and remove card-derived/raw unbounded payload persistence. Preserve existing callback success and refund-claim behavior.
3. **P1c — Capture history:** additive location/item snapshots, listing revisions, inventory journal and transactional audit. Add accepted-payment and unique-posting constraints after profiling existing data. Repair all shared financial formulas without changing already posted historical money.

**Migrations:** nullable/additive fields and tables first; resumable classified backfills; validate constraints only after discrepancies are reviewed. New rows must be complete after cutover. **APIs:** preserve existing listing/checkout response shape; add optional request-key/revision fields initially, requiring keys on newly introduced commands. New APIs use a structured error envelope.

**Tests:** cross-merchant and cashier/manager/owner matrix; revoked/disabled user; concurrent holds/checkouts/callbacks/refunds; crash after gateway acceptance; duplicate distinct successful authorities; late payment; counter/journal rollback; zero commission; altered listing and merchant rate after checkout; unknown legacy location. **Dependencies:** owner decisions in Section 10. **Risks:** misattributed historical locations, inconsistent historical payments, lock order deadlocks, application rollback writers omitting journals.

**Acceptance/DoD:** all new writes have correct scope and complete history; journal deltas reconcile from baseline; exactly one accepted payment and set of postings per order; unknown outcomes remain unresolved without repeated charge; historical money does not change with current prices/rates; scoped regression tests, disposable-DB concurrency tests, types/lint/build and affected browser flows pass. Existing M11 coverage gate remains accurately reported.

### Phase 2 — Marketplace reporting with quality and freshness

**Objective:** actionable owner report without repetitive entry. **Scope:** marketplace confirmed collections/refunds, listing performance and pickup outcomes; quality panel; outbox/worker only for actual asynchronous consumers. Add optional product mapping only if repeated product reporting is approved. **Schema:** outbox/consumer receipts; optional summaries/product catalog. No generic POS tables or public import API yet.

**APIs:** `GET /api/merchant/reports/overview?merchantId=...&locationId=...&from=...&to=...`; `GET /api/merchant/data-quality?...`. Server authorizes every query. Owner-scoped CSV uses the existing escaping helper. **Tests:** scope on every subquery, refund in a later period, UTC/Tehran midnight, closed/open cohorts, absent denominators, late events, worker crash before/after commit, lease recovery and projection replay. **Dependencies:** P1 capture and agreed metric version. **Risks:** old history overclaim, expensive joins, stale or duplicated projections.

**Acceptance/DoD:** controlled fixtures reconcile to order/ledger values; report states coverage start, unknowns, exclusions and as-of watermark; low-data output is useful and honest; projections rebuild exactly; no new daily-entry requirement; private/no-store responses and Persian RTL accessible UI verified. Proposed initial service targets to approve: p95 bounded report query under one second for the agreed pilot dataset, normal projection lag under five minutes, alert on lag above fifteen minutes. These are targets, not measured current performance.

### Phase 3 — AI-ready, read-only weekly insights

**Objective:** answer “What happened to my Loqme offers this week, and what should I review?” **Scope:** deterministic comparisons and evidence retrieval; optional Persian narrative model; no autonomous pricing, forecasting claims, inventory changes or publishing. **Schema:** small InsightRun record only if saved/reproducible reports are needed; no vector store. **API:** `POST /api/merchant/insights/weekly` with authorized scope and interval; server chooses tool/data access.

Return facts separately from interpretation, cite specific report rows/evidence, and explain missing data. Start with suggestions such as reviewing a repeated low-sell-through category; do not assert optimal price, profit improvement or measured waste reduction without the needed data and evaluation.

**Tests/evaluation:** at least a curated pilot set covering no activity, incomplete historical snapshots, stale feed, refunds/no-shows, two stores, malicious listing text and ambiguous products. Compare monetary claims to deterministic output; require 100% of displayed numeric financial facts to trace to that output and zero unauthorized records in adversarial tests. Record merchant helpfulness and recommendation acceptance separately from actual outcome lift. **Dependencies:** P2 and approved provider/data policy if using a model. **Risks:** plausible unsupported explanations, data exfiltration, model unavailability and cost. **Done:** safe fallback is the ordinary report; low quality triggers abstention; no model has direct DB/SQL/network/financial tool authority.

### Phase 4 — Two independently gated integration tracks

**P4a POS:** discovery first: exact PSP/acquirer, terminal model/firmware, connection type, SDK licensing and supported OS/runtime, sandbox/hardware access, amount units, authoritative inquiry, uniqueness guarantees, reversals, timeout behavior, offline behavior and required approvals. Do not promise compatibility. Choose Windows/.NET/local bridge only after these requirements are verified; no separate authoritative business backend is implied.

After approval, implement device authorization, staged ingestion, ExternalSale/lines/evidence, reconciliation and a sandbox pilot. The bill amount must be deterministic and validated against the agreed catalog/price version; a desktop UI calculates a preview, not an unchecked server-authoritative total. If offline trading is allowed, define bounded offline authority and conflict policy explicitly; otherwise fail closed when required verification is unavailable.

**P4b receipts/invoices:** independent private-upload and extraction pilot. Identify sales receipt versus supplier invoice versus payment slip before deciding its effect. Importing a purchase invoice does not prove goods were received; a sales receipt does not prove bank settlement. Extraction first creates candidates; review or a separately approved trusted-source rule is required before canonical facts. No direct stock adjustment from OCR.

**Schema/APIs:** staged connection-scoped ingestion and pollable job status; external-sale/document entities from Section 6. **Tests:** device revocation, unsigned/spoofed result, terminal/provider amount mismatch, timeout after actual debit, repeated upload, multi-terminal reference collision, duplicate receipt of a marketplace order, Persian digits/separators, weighted units, late/offline upload, partial imports and source corrections. **Dependencies:** P1/P2; P3 is optional. **Risks:** no supported terminal API, licensing restrictions, unverifiable payment result, duplicate channels, sensitive documents. **Done:** actual chosen hardware/provider acceptance and reconciliation evidence; no new canonical sale or inventory effect from unverified payment claims. Receipt-only observations may remain useful without being counted as verified paid sales.

### Phase 5 — Confirmed merchant automation

**Objective:** reduce listing entry using text, and later voice. **Scope:** prepare a draft, show exact changes, validate and confirm; add only approved actions. **Schema:** ActionProposal and execution record; listing revision/CAS already available. **APIs:** create proposal, retrieve preview, confirm proposal, cancel proposal. A request to generate or preview a proposal never executes it.

For “three extra portions of rice, price X and discount Y,” extract candidates; resolve store/product/units; ask only for missing consequential facts such as original-versus-final price meaning, pickup window and required safety information. Reuse known store defaults, uploaded images and approved product metadata. Never invent allergen/safety/expiry data, and preserve the two existing listing types unless product scope is separately expanded. Price/discount inconsistency needs clarification rather than applying both silently.

Confirm against a stored canonical payload hash and expected revision; recheck membership, account activity, merchant/safety status, image requirements, price/stock/time constraints inside the same domain transaction. A changed proposal or stale inventory returns conflict and requires a new preview/confirmation. Confirm retries return one original execution result. Expired/replayed confirmations cannot publish again.

**Tests:** prompt injection, forged confirmation, different confirming tenant, revoked permission, stale version, expired food/window, unsupported action, duplicate confirm, competing merchant edit and voice transcription ambiguity. **Dependencies:** P1/P2/P3; POS is not required. **Risks:** unnoticed interpretation mistakes and privilege widening. **Done:** consequential actions have explicit attributable merchant confirmation and normal domain invariants; existing manual flow remains available. Voice requires separately scoped microphone permission: current Next config has `microphone=()`.

## 8. File-level implementation plan and representative contracts

All paths in this table are relative to `D:/AiProjects/loqme`. For readability, paths beginning with `domain/`, `lib/`, `app/` or `components/` abbreviate `apps/web/src/` followed by that path. **New** means proposed; inspect existing files before implementing.

| Phase | Existing files to modify | Proposed new files and responsibility |
|---|---|---|
| P1a | `apps/web/src/domain/merchant/merchant.service.ts`; `lib/auth/admin-auth.ts`; `lib/auth/session.ts` as needed; merchant mutation routes; `app/api/pickup/no-show/route.ts`; `domain/pickup/pickup.service.ts`; `packages/types/src/index.ts`; `packages/validation/src/index.ts` | `apps/web/src/domain/merchant/merchant-access.service.ts`, `merchant-context.ts`: live scope and action permission; `apps/web/src/lib/http/merchant-http.ts`: bounded JSON, auth, no-store and errors |
| P1b | `domain/reservation/reservation.service.ts`; `domain/inventory/inventory.service.ts`; `domain/order/order.service.ts`; `domain/payment/{payment.service,gateway.interface,zarinpal.gateway}.ts`; checkout/verification routes; `prisma/schema.prisma` | `domain/operations/operation-receipt.service.ts`; `domain/payment/payment-attempt.service.ts`, `domain/payment/reconciliation.service.ts`; `app/api/admin/reconciliation/route.ts`, `app/api/admin/reconciliation/[id]/resolve/route.ts`; minimal `app/(admin)/admin/reconciliation/page.tsx` |
| P1c | Listing service and photo/pickup-detail helpers; inventory/order/payment/pickup/moderation services; `domain/moderation/audit.service.ts`; schema; existing receipt readers | `domain/listing/listing-revision.service.ts`; `domain/inventory/inventory-journal.service.ts`; `domain/order/order-snapshot.ts`; `scripts/backfill-merchant-history.ts` with dry-run/resume; timestamped `prisma/migrations/<timestamp>_merchant_history/` and later validated constraints migration |
| P2 | `domain/analytics/analytics.service.ts`; merchant finance/dashboard methods; admin analytics routes; merchant page/finance; shared package indexes; `Dockerfile`, Compose/workflow only when worker ships | `domain/analytics/merchant-reporting.service.ts`, `metric-definitions.ts`, `business-time.ts`, `data-quality.service.ts`; `domain/events/outbox.service.ts`, `outbox-worker.ts`; `scripts/run-merchant-worker.ts`; report/data-quality routes; `app/(merchant)/merchant/insights/page.tsx`; shared `merchant-data.ts` contracts/schemas |
| P3 | Reporting contracts, insight UI, config and shared API exports | `domain/insights/merchant-insight.service.ts`, `insight-provider.interface.ts`, `insight-evidence.ts`; `app/api/merchant/insights/weekly/route.ts`; `tests/merchant-insight-evaluation.test.ts` |
| P4a | Schema, config, worker, reporting source union; shared ingestion contracts | `domain/integrations/{ingestion.service,integration-auth.service}.ts`; `domain/pos/{terminal-adapter.interface,external-sale.service}.ts`; selected adapter only after discovery; `app/api/integrations/v1/events/route.ts`, `events/[id]/route.ts` |
| P4b | Schema, worker, reporting coverage rules; no reuse of public photo URLs for private documents | `domain/documents/{private-document-storage,receipt-extractor.interface,document-import.service}.ts`; merchant document upload/status/review routes; extraction review UI |
| P5 | Listing service receives validated actor/context/expected revision; FastListingModal/shared preview components; config only for approved voice | `domain/assistant/{proposal.service,action-policy,listing-intent}.ts`; `app/api/merchant/assistant/proposals/route.ts`, `[id]/confirm/route.ts`; `components/merchant/ListingChangePreview.tsx` |

Implementation must also update `docs/PROJECT_STATUS.md`, an approved new milestone/checkpoint file, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md` and `docs/SECURITY.md` with **actual** acceptance evidence. Do not mark later phases done because interfaces exist. No governance files were updated by this planning-only audit.

Representative **proposed**, not existing, contracts:

```ts
// Server constructed; never accept this object directly from request JSON.
type MerchantContext = {
  userId: string;
  merchantId: string;
  locationIds: string[];
  permission: "REPORT_READ" | "LISTING_WRITE" | "FINANCE_READ";
};

// New JSON money fields use decimal strings.
type MerchantReport = {
  metricVersion: "marketplace-v1";
  scope: { merchantId: string; locationId: string | null };
  from: string; to: string; timezone: "Asia/Tehran";
  asOf: string; coverageStart: string | null;
  confirmedCollections: { amount: string; currency: "IRT" };
  confirmedRefunds: { amount: string; currency: "IRT" };
  pendingReconciliationCount: number;
  completeness: { knownLocations: number; totalOrders: number };
  warnings: { code: string; messageFa: string }[];
  evidence: { metric: string; queryVersion: string; watermark: string }[];
};

// Future adapter result: unknown is not declined or verified.
type VerifiedPaymentOutcome =
  | { kind: "VERIFIED"; reference: string; amountToman: string; verifiedAt: string }
  | { kind: "DECLINED"; safeCode: string }
  | { kind: "UNKNOWN"; safeCode: string; nextInquiryAfter: string | null };
```

The context type illustrates responsibilities; actual enforcement must revalidate mutable permissions during execution. Context creation alone is not proof against later revocation.

Future ingestion example:

```text
POST /api/integrations/v1/events
Authorization: a revocable device/connection credential
Idempotency-Key: source-stable opaque event key

{ schemaVersion: 1, externalRecordId, externalVersion, eventType,
  occurredAt, sourceCurrency, lines, claimedPaymentReference }

202 -> receiptId, validationState, verificationState, statusUrl
200 -> original receipt for identical retry
409 -> same key with a different canonical payload
422 -> invalid fields, units, totals, or unsupported event type
```

Merchant/location are resolved from the connection grant or selected from its explicitly authorized locations. Payload claims cannot grant access. A 202 means durably received, not payment verified or inventory updated. Individual line validation and all-or-nothing sale posting are distinct from per-event batch intake results; report partial batch failures clearly.

Confirmation example:

```text
POST /api/merchant/assistant/proposals
  -> proposalId, validated preview, payloadHash, expectedRevision, expiresAt

POST /api/merchant/assistant/proposals/{id}/confirm
  { payloadHash, expectedRevision } + Idempotency-Key
  -> reauthorize -> lock proposal/resource -> revalidate -> execute command
     -> audit + movement/revision + execution result in one transaction
```

Errors use `{ success: false, code, message, retryable, correlationId }`. Use 401 unauthenticated, 403 unauthorized, 404 for unavailable scoped resources, 409 for revision/idempotency conflicts, 422 for semantic validation, 429 for quota/rate limits and 503 for temporary provider/worker unavailability. Never return raw provider responses, database errors or credentials.

Retry policy: retry transaction deadlocks/serialization conflicts with a small bounded jittered retry around idempotent DB-only work; never retry an external charge inside that transaction. Retry network delivery with the same event key. For ambiguous money movement, inquire/reconcile using documented provider capabilities; do not resubmit. Outbox consumers reclaim expired leases, use bounded exponential backoff, and dead-letter after a configured limit (proposed eight attempts), with an audited operator replay path. Validation conflicts remain quarantined until corrected, not retried forever.

## 9. Testing, migration, deployment and rollback

### Audit-time validation actually performed

Executed existing **mocked** suites, with no database/provider access:

```text
.\node_modules\.bin\vitest.cmd run
  tests/payment-service-boundaries.test.ts
  tests/reservation-boundaries.test.ts
  tests/merchant-financial-boundaries.test.ts
  --reporter=dot

Result: 3 suites passed, 58 tests passed, exit code 0.
```

Vitest emitted a non-failing warning about future native config loading of ESM syntax in a CommonJS-loaded config. No new tests or application code were written. Full tests, database concurrency, build, lint, browser tests and live provider checks were not rerun in this audit. Historical pass counts in docs are not fresh validation. The identified static failure scenarios are not claimed to be reproduced exploits.

### Required implementation validation

1. **Unit/contract:** facts and metric formulas, source precedence, monetary bounds/rounding, Persian digits and normalization, interval validation, unknown-versus-zero, hash canonicalization, duplicate keys, redaction and permission decisions. Extend existing boundary tests rather than treating implementation-mirroring assertions as coverage.
2. **Real database:** fresh disposable PostgreSQL 16/PostGIS 3.4 matching deployment; naming/target guard before migrations or seed. Test schema constraints, rollback under injected faults, simultaneous same/different payment authorities, hold/expiry/confirm races, refund/confirm races, stale listing revision and cross-tenant composite FKs. A mocked Prisma transaction does not test locking.
3. **Historical accuracy:** changing current commission, original price, title, category, location/address and pickup time must not rewrite new-order reports. Legacy inferred values remain labeled. A refund in a later month appears on its own cash date and can also be attributed to the original sales cohort.
4. **Authorization:** two merchants, multiple stores, owner/manager/cashier, changed role, disabled account, membership revocation, admin demotion, revoked integration device, forged tenant IDs in nested payloads. Assert every report subquery, export, private file and job result is scoped.
5. **Replay/recovery:** process failure before/after outbox commit, consumer crash after projection before acknowledgment, lease expiry, duplicated and reordered messages, event version changes, stale source timestamps, delayed corrections and rebuilding summaries.
6. **UI/browser:** existing merchant workflows plus report missing/stale/reconciling states; Persian numerals/Toman/Jalali/RTL; 360/390/768/1440px, keyboard/axe; no duplicate confirmation on double click; manual listing flow works without AI or a provider.
7. **Provider/hardware:** only after a selected provider supplies documentation and a test environment. Validate debit followed by lost response, authoritative inquiry, terminal restart, amount units, refund/reversal capabilities and real reconciliation. Mock gateway success is not POS acceptance.
8. **Release checks:** `npm test`, workspace typecheck, lint, build, targeted/full affected Playwright cases, and the existing coverage command. Keep 100% thresholds intact and explicitly report any remaining CP-11.9 failure. Current deploy validation runs ordinary tests, not the coverage gate; decide how the new checkpoint and coverage policy gate rollout rather than claiming CI enforces all documented requirements.

### Migration and backward compatibility

**Expand:** first deploy additive tables and nullable fields; separate unique-index/constraint validation from schema creation. Inventory journal cutover requires a consistent locked baseline for each listing. Capture baseline counters/version and begin journal writes atomically, or use a controlled write pause; taking an unlocked snapshot while writers run causes unreconcilable gaps.

**Backfill:** run a dry-run profiler on an approved environment: null/invalid listing locations, multi-location orders, duplicate pending holds, multiple successful payments, missing ledger postings, and counter discrepancies. Source mapping must be deterministic. An existing listing location may provide linkage evidence but not proof of the historical address. A sole current location is still only an inference for older orders. Never silently choose `locations[0]` or rewrite old paid amounts. Keep unknowns as null, mark reconstructed provenance, and route conflicts for review.

Backfill in small idempotent batches with checkpoints, counts and hashes; resume after failure. Create opening inventory entries rather than reverse-engineering unrecorded adjustments. Historical event timestamps reconstructed from PaymentEvent or ledger creation must include their evidence and limitations; do not fabricate verifiedAt from mutable updatedAt. Deduplicate financial postings only through an approved reconciliation decision; do not delete rows to make a unique index pass.

**Dual operation:** new writers capture authoritative fields; old readers continue until snapshots/projections reconcile. Shadow new reports against independently calculated ledger fixtures and observed production aggregates after authorized rollout. Treat old rows without complete evidence separately. Contract/remove legacy fields only in a later checkpoint after all readers and retained rollback images are compatible.

### Deployment and rollback

Use the existing backup-before-migrate workflow and immutable container revision. First validate restoration into a disposable database, not just checksum/dump listing. Keep migrations compatible with the previous image because current rollback restores application code while retaining migrations. No automatic destructive down migration or production reseed.

Use per-merchant rollout controls for reporting/insights/imports. Data capture and worker enablement are separate switches: disabling reporting/AI must not disable authoritative financial journaling. Ship a worker only once the image includes a tested entry point, graceful stop, lease recovery and health visibility. Existing app readiness does not imply worker health.

If rollback to an old writer stops producing new journal/events, **mark the coverage gap and halt dependent “complete” reporting**; preserve incoming records and reconcile afterward. Do not claim uninterrupted history across incompatible writers. Prefer rolling forward a repaired capture path or restricting affected writes during recovery. Pause external intake/confirm actions when authority is uncertain; retain unprocessed receipts/outbox rows for replay.

Monitor: pending payment/refund age, verified-but-unallocated amounts, duplicate authorities, inventory counter/journal mismatch, missing snapshots, outbox oldest age/lease failures/dead letters, report latency, ingestion lag/rejection rate, tenant-denial events, provider errors and AI evidence/abstention rates. Use non-sensitive IDs/codes; restrict detailed reconciliation evidence to authorized staff.

No card number/PAN/CVV/track/PIN data is required. Whitelist payment evidence fields before database persistence and before logging. Audit records should omit secrets and unnecessary customer mobile/address details. Private receipts need authenticated downloads, short-lived access if supported, bounded decoder/OCR resources, content validation, malware strategy, retention and deletion controls. Do not place invoices in the public listing image store. Model input excludes raw customer/payment credentials and unnecessary documents; approve residency/retention/provider terms before enabling external processing.

### Data minimization and measurable quality

| Needed information | Lowest-effort source | Remaining input/quality rule |
|---|---|---|
| Marketplace sale amounts, units, refund and handoff | Existing verified checkout/ledger/pickup capture | No merchant re-entry; separate coverage and financial exceptions |
| Listing availability/history | Transactional changes and journal | Adjustment reason required only when manually changing allocation |
| Product identity across repeated offers | Optional reuse of saved merchant product or confirmed mapping | Do not infer identity solely from similar names; report mapping coverage |
| Whole-business sales | Approved POS or trusted source import | Until then label all reports marketplace-only |
| Physical stock, returns, spoilage | Validated stock movements/source integration | Merchant count/disposal declaration where no reliable source exists |
| Food expiry, allergens, storage | Verified label/batch data and merchant declaration | Missing safety facts require explicit input; AI cannot certify them |
| Profit/margin | Costs and commercial policies, only if a real use case is approved | Do not collect costs or invent margins merely to feed AI |

Quality measures should expose numerators and denominators: orders with known location / relevant orders; orders with contemporaneous snapshots / relevant orders; mapped sold units / total sold units; settled/verified payment coverage; counter/journal discrepancy count; outstanding cases/amount; source event-to-receipt lag; receipt-to-acceptance lag; latest heartbeat and watermark by source. No records arriving can mean either no sales or a broken connection; freshness must consider heartbeat/cursor evidence. Estimate missing-data coverage without counting unknown records as verified zeros.

## 10. Open questions and approval gates

None of these blocked a useful audit. They do block specific implementation decisions.

| Decision | Recommended starting point | Required before |
|---|---|---|
| Milestone authorization | Approve P1 as a named checkpoint; preserve outstanding M11 gates | Any implementation |
| Merchant/store semantics | Keep Merchant as tenant; MerchantLocation as physical branch only after confirming business meaning; no new organization hierarchy | Location migration/API |
| Multi-store access | Explicit selector; no ambiguous first-store fallback when more than one choice exists; defer chain-level organization features | Branch rollout |
| Staff permissions | Owner-only finance/insights; explicitly decide whether managers/cashiers publish or adjust stock | Authorization refactor and AI writes |
| Sales recognition/no-show/refunds | Separate verified cash, allocated order sales and fulfillment; do not call accrued payable a bank payout | Metric release |
| Historical repair policy | Preserve originals, classify unknowns/inferences, operator-review financial anomalies | Backfill and constraints |
| First merchant value | Marketplace weekly performance and evidence-backed review suggestions | P2/P3 product scope |
| Product/batch scope | Keep mixed bags unmapped; add product IDs only for a committed repeated-product use case | Product catalog or physical inventory |
| AI provider, privacy and budget | Deterministic report first; optional replaceable provider with bounded input and no autonomous write access | External model calls |
| Data retention and private documents | Separate necessary financial audit retention from shorter raw document/audio/chat retention; seek jurisdiction-specific review when policy is drafted | Document/voice collection |
| POS vendor/hardware/verification | Supply exact provider, terminal model, SDK/docs and testing access; feasibility remains unverified | Any desktop/terminal implementation |
| Offline and partial refunds | Default no unverifiable settlement and existing full-refund support; expand only with an approved model | Offline POS, item returns or partial refund work |
| Rollout quality targets | Approve freshness/latency/coverage targets and escalation ownership | Pilot release |
| Automation policy | Explicit confirmation per consequential action; no standing autonomous publishing permission | P5 |

Unresolved environmental facts: current production schema/data quality, installed host cron jobs, live provider access, volume/performance characteristics, actual multi-location usage, existing reconciliation backlog and regulatory/contract requirements. This report deliberately does not invent those answers.

## 11. Implementation handoff

Give an implementation agent this report together with an explicit phase/checkpoint authorization. The ordered task list is:

1. Read AGENTS, current PROJECT_STATUS, ROADMAP and the approved checkpoint. Verify HEAD and existing changes; recheck the evidence affected by changes since this audit.
2. Record approved identity, permission and metric decisions in an ADR. Identify every listing/stock/payment writer, including raw SQL, moderation and background paths.
3. Add live merchant context/action authorization and current admin checks. Scope the no-show route or restrict it to an internal worker. Add cross-tenant and revoked-permission regressions first.
4. Specify transaction lock ordering and durable idempotency keys. Make reservation creation atomic, handling existing duplicate/expired holds safely.
5. Persist payment attempts before provider interaction; classify ambiguous outcomes explicitly; enforce one accepted funding attempt per order; add operator reconciliation for late/duplicate/unknown outcomes. Do not add a new terminal adapter.
6. Ship additive order/location snapshots, listing revision and inventory movement schema. Implement all capture paths transactionally with audit and stable financial posting keys.
7. Dry-run and review backfills; perform a consistent inventory baseline cutover; validate constraints only after discrepancies have a documented disposition. Preserve unknown legacy history.
8. Build one scoped reporting service with versioned definitions and Tehran date boundaries; repair divergent existing analytics; expose coverage, freshness and pending exceptions. No whole-business or waste claims.
9. Add a PostgreSQL outbox/worker only for selected asynchronous consumers; test delivery replay, leases, dead letters and rebuildable reports in the production image.
10. Deliver and validate the owner report in Persian RTL using existing design tokens/components. Measure usefulness and collection completeness before asking merchants for more data.
11. Add read-only evidence-grounded weekly insights only after its gate. Evaluate unsupported claims, tenant leakage and missing-data behavior. Keep deterministic fallback.
12. Separately investigate POS hardware/provider capabilities and private receipt import. Obtain track-specific approval, then implement staged/verified ingestion with deduplication and reconciliation. Never count an uploaded payment request as success.
13. Add text proposal/preview/confirmation after the underlying listing commands are complete. Add voice only after its permission/data policy is approved. Do not grant AI direct financial or safety authority.
14. For each approved checkpoint, run relevant unit/DB/concurrency/browser/security/release checks, document exact results and outstanding failures, rehearse compatible rollback, and update status/milestone/domain documents. Stop at the authorized checkpoint boundary.

**Implement first:** authorization consistency, reservation/payment recovery, explicit location attribution, immutable transaction context, inventory history and correct marketplace metrics.

**Architecturally prepare now:** source/verification vocabulary, idempotency and evidence contracts, optional product mapping, same-repository worker/outbox design, private document and terminal adapter boundaries, and a permission-controlled insight service.

**Explicitly defer:** Windows/POS application, terminal bridge/SDK implementation, OCR/receipt pipeline, complete physical inventory/batch system, autonomous pricing, voice automation, full AI assistant, broker, warehouse, vector database, and separate backend services. None is needed to ship the first useful merchant data release.
