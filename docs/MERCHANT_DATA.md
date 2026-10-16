# Merchant data foundation — LQ-MDAI-001

Implemented locally on 2026-10-13. [Approved plan](plans/LQ-MDAI-001.md), [checkpoint tracker](milestones/M12-merchant-data.md). This is the first marketplace reporting release; the original multi-phase roadmap is not complete.

## Delivered surface

- `/merchant/insights`: owner-authorized store/branch selection, seven or thirty complete Tehran calendar days, exact integer Toman amounts, quality disclosures and deterministic evidence-linked insights. Sparse samples abstain from pricing or quantity recommendations. All text, money and dates use Persian/RTL conventions.
- `GET /api/merchant/contexts` and `GET /api/merchant/reports?merchantId=<uuid>&locationId=<optional uuid>&days=7|30`; shared DTO, query schema and `createApiClient().merchantData` methods support future clients. Responses are private/no-store, including errors. Reports include no customer identities, payment authorities or receipt documents.
- `/admin/reconciliation`: live administrator authorization; bounded oldest-first queues for open cases, initiation attempts stuck over five minutes, unsettled refunds over five minutes and verified payments without an allocation. Each group is capped at 100. This is an operational review queue, not a complete accounting export.
- `POST /api/admin/reconciliation/<case-or-unallocated-payment-id>/resolve`: `RECHECK` verifies an existing authority and attempts normal order completion; `RESOLVE` checks persisted evidence only. Neither submits a new charge nor sends a refund. A case closes only on the exact accepted payment or a settled refund and produces one audit entry. Unknown initiation/refund results without authoritative evidence remain open for provider-assisted review.

## Authority and transactional guarantees

Merchant is the tenant; MerchantLocation is the branch. Current database membership/activity overrides session claims. Private reports require OWNER; listing mutations and image uploads require MANAGER or OWNER; pickup scope respects the scan permission. Missing merchant selection is rejected when the account has multiple accessible stores. Multi-location listing creation requires an explicit valid `locationId`; no branch is silently selected. The new report page supplies a selector; older single-store operational pages are not yet a full multi-store workspace.

Reservation creation holds a transaction-scoped advisory lock for the customer/listing pair. A replay of the same live quantity returns the existing hold; a different quantity requires cancelling the hold. Counter changes, movement history and reservation insertion commit or roll back together. The existing atomic SQL eligibility/availability predicates remain authoritative. This is live-hold deduplication, not a generic durable HTTP operation-receipt framework for every merchant write.

An order is prepared under a reservation row lock. Integer arithmetic preserves a zero commission rate and stored order amounts. A PaymentAttempt is committed before the provider call. A partial unique index permits only one non-declined attempt per order. Replays reuse the durable authority/URL, or return an uncertainty message. Timeouts, invalid responses and interrupted submission never automatically send another bank request. Zarinpal negative responses remain UNKNOWN until definitive retry codes and inquiry behavior have provider acceptance evidence.

Order completion locks Order then Payment, rejects mismatched amounts, pending refunds and a second payment, claims the reservation, records one acceptedPaymentId and writes uniquely keyed ledger postings. Verification, allocation and refund settlement have distinct timestamps. Provider verification can persist even when fulfillment fails; the review queue surfaces both recorded cases and interrupted unallocated payments. Refunds of unallocated extra payments do not reverse the accepted merchant sale. Unknown refunds remain claimed and cannot be automatically resent.

## Historical records

OrderItem captures title, category ID/name, original price, pickup times, listing revision and selected safety/image/pickup terms on insert. Order captures pickup location/address. Purchased item facts, financial amounts, accepted payment and known payment times cannot be overwritten. Refund/payment identity consistency is checked in PostgreSQL.

ListingRevision and ListingInventoryMovement are append-only histories with retained source IDs. Listing/safety/image/pickup-attribute changes advance listing revision. Raw SQL and Prisma writes share the same database capture boundary. Inventory entries describe marketplace allocation counters, not physical stock, food consumption or waste. Total/reserved/sold deltas and resulting balances are recorded; transaction-local actor/reason settings attribute merchant edits without leaking across pooled connections. System or older writers without an actor remain explicitly null.

Version selection runs BEFORE writes; history capture runs AFTER the actual insert/update. This is necessary for PostgreSQL upserts, where an attempted insert may become an update. The opening migration locks Listing and ListingInventory while capturing a BASELINE and enabling triggers. A baseline is an observation at migration time, never reconstructed past activity. Source deletions do not delete the historical journals; purchased listing references retain the existing restrictive relation.

Legacy purchase snapshots and event timestamps remain null. No current commission, current original price, mutable updatedAt or first current location is used to fabricate historical report facts. Existing receipt readers retain their compatibility fallback for older rows; new reports expose unknowns separately. The historical admin analytics dashboard is not reused as the merchant fact API; its broader cohort/geography/sell-through redesign remains follow-up work.

## Metric version 1

| Field | Exact definition |
|---|---|
| collectionsToman | SUCCESS or REFUNDED payments whose known verifiedAt is inside the half-open interval; includes verified extra/unallocated collections |
| refundsToman | SETTLED refunds whose known settledAt is inside that interval |
| netCollectionsToman | Collections minus refunds in this interval; may be negative; not bank payout, profit or accounting revenue |
| bookedSales/Commission/MerchantPayable | Immutable order amounts for accepted payments with paidAt in this interval, before subsequent refunds |
| paidOrderCount | Number of those allocated orders, independent of current fulfillment status |
| previousPaidOrderCount | Same allocated-order definition in the immediately preceding equal-length interval |
| pickupCount | Verified pickup events with verifiedAt in the interval; a different cohort from newly paid orders |
| unknownPaymentTimes / unknownRefundTimes | All-history unknown timestamps within the selected scope, excluded from dated cash totals |
| unknownLocations | All-history orders before the interval end with unknown branch, for the whole merchant |
| openReconciliations | Open stored cases for the whole merchant, explicitly labelled even in a branch report |
| historyCoverageStartIso | Earliest recorded listing history observation for the scope, not proof of earlier complete coverage |

Money is serialized as decimal strings. Reads use one RepeatableRead transaction. The window contains complete local calendar days and excludes today. The fixed +03:30 rule is bounded to the supported current/post-2023 reporting period. No physical waste, total in-store revenue, causal explanation, predicted optimal price or actual outcome lift is inferred.

## Migration and rollout

Five additive migrations introduce capture and integrity functions, journal tables, payment attempts, reconciliation cases and nullable historical fields. Prisma represents the new defaults/indexes; the existing unsupported PostGIS GiST index remains migration-owned. Never apply Prisma's suggested deletion of `idx_merchant_location_geom` from a drift report.

Only disposable local PostgreSQL databases were migrated/seeded in this task. No production migration, configuration change, deployment, commit or push was performed. Before deployment: obtain the ordinary deployment authorization, prove backup restoration, pause financial/listing writes for the complete migration batch, deploy the matching application, run the read-only profiler and inspect shadow totals. Do not roll back financial writes to a pre-M12 application while unresolved attempts exist: older code does not enforce the new attempt protocol. No destructive down migration or guessed backfill is provided.

After expansion, run `npx tsx scripts/audit-merchant-history.ts` with an explicitly selected approved DATABASE_URL. It prints aggregate counts only and performs no writes. Investigate unknown allocations, multiple successful payments and any inventory-history mismatch. Provider inquiry and manual recovery need recorded external evidence; the UI deliberately cannot mark unknown funds successful.

Direct synchronous reporting was chosen for the pilot: there is no asynchronous consumer, external ingestion or projection lag to justify an outbox/worker yet. Performance targets and production volumes were not measured. Before external feeds or expensive projections, add the planned outbox, leases, replay tests and projection watermark. POS hardware/SDKs, private receipt ingestion/OCR, physical stock/batches, external models, voice and confirmed assistant actions remain gated phases of the original plan.

## Validation

See [M12 validation](milestones/M12-merchant-data.md#validation) for commands and measured results. The repository-wide 100% coverage gate remains open under CP-11.9; passing ordinary tests is not a production release sign-off.
