# M12 — Merchant data foundation

Plan: [LQ-MDAI-001](../plans/LQ-MDAI-001.md). Owner authorized implementation on 2026-10-13.

## Scope and decisions

Deliver the plan incrementally using the existing modular monolith. Merchant remains the tenant and MerchantLocation the physical location. Owners read private financial insights; owners/managers manage listings; cashiers operate pickups. Current financial amounts are preserved, legacy missing history remains unknown, and confirmed collections are distinct from fulfillment or physical waste. No production migration, deployment, commit or push is part of this work.

The original plan remains the design baseline. The implementation may use PostgreSQL transactional capture triggers where raw SQL and multiple existing writers would otherwise bypass history; rationale and validation must be recorded. No asynchronous consumer means no outbox/worker is required yet. Deterministic evidence-based insights do not require an external AI provider.

## Checkpoints

- [x] CP-12.0 — Save approved plan under permanent ID LQ-MDAI-001.
- [x] CP-12.1 — Live authorization, merchant-scoped no-show sweeps, explicit report context, ambiguity rejection and valid branch selection for listing creation.
- [x] CP-12.2 — Atomic live-hold deduplication, durable one-active payment attempts, accepted allocation, uncertain-outcome recovery and evidence-gated reconciliation.
- [x] CP-12.3 — Immutable purchase facts/terms, listing/child revisions, append-only inventory history and attributable merchant edits.
- [x] CP-12.4 — Owner-scoped synchronous marketplace reports, exact money, quality disclosures, deterministic weekly insights and Persian RTL UI.
- [x] CP-12.5 — Automated validation, migration/profile checks, compatibility documentation and local handoff; production release gates remain open below.

## Deferred gates

POS/Windows/terminal adapters require exact provider/hardware/SDK details. OCR/private document ingestion, physical stock/batches, voice, externally hosted model processing and consequential assistant automation remain separately gated in LQ-MDAI-001. Do not label these delivered or fabricate integrations.

## Acceptance

Scoped authorization, database concurrency/integrity tests, accurate money and event-time reporting, explicit unknown legacy history, Persian RTL report states, typecheck/lint/build and affected browser coverage. Record actual results below. Existing CP-11.9 coverage and live provider/device gates remain open.

## Validation

2026-10-13, local Windows/WSL PostgreSQL 18 with PostGIS. Only explicitly named disposable `loqme_onboarding_test_mdai_*` databases were used. Docker was unavailable. No real merchant/provider data was used.

- Full ordinary suite: **981/981 passed**, zero failures/skips (`.artifacts/mdai-last-tests.json`). This includes the new recovery test added after the coverage run.
- Focused final boundary/integration run: **125 passed** across nine matched files. Real PostgreSQL tests cover concurrent same-customer reservations, failed persistence rollback including history, one external initiation across retries, unknown provider results, immutable snapshots, cross-tenant branch rejection, upsert capture, pooled actor isolation, duplicate payments/refunds, evidence-gated case resolution and recovery after interrupted allocation.
- Workspace typecheck, zero-warning ESLint and production Next build passed. Builds used an ignored `.next-mdai-build` directory. Generated Next config edits were removed from the deliverable.
- Browser: **13/13 passed**, including new reports/admin recovery and existing merchant feedback flows. Layout/axe checks passed at 360, 390, 768 and 1440 pixels; desktop screenshot inspected (`.artifacts/merchant-data-desktop.png`). Browser fixtures validate UI; integration tests separately validate real DB authority.
- All five new migrations applied successfully, including fresh installation of the preceding migration chain and extension. The read-only history profiler reported **zero inventory-history mismatches**. Post-migration Prisma diff has no new-model drift; its only proposal is removal of the already-existing unsupported PostGIS index, which was not applied.
- Coverage command: **980/980 tests passed in that run**, but the **unchanged 100% global gate fails**: statements 58.37%, branches 53.36%, functions 46.72%, lines 60.58%. CP-11.9 remains open. Ordinary test success is not a release sign-off.
- Old test fixtures now supply live admin state/actor arguments, declare definitive decline when testing retry, use the new order-number format, pin the intended two-minute OTP configuration explicitly, and avoid re-registering a fixed existing test account. Production OTP validity remains unchanged at its repository-defined default.

## Implementation decisions and next gates

The implementation contract, exact metric definitions, recovery procedure and rollout restrictions are in [MERCHANT_DATA.md](../MERCHANT_DATA.md). Direct RepeatableRead reports replace the initially proposed asynchronous projections for this pilot; no consumer/outbox, broker or external model is introduced. Legacy history remains unknown rather than inferred. Five migrations must be applied as a complete batch during an authorized write pause, followed by the matching application; pre-M12 financial writers are not a safe rollback target while attempts are unresolved.

This checkpoint is the first release of LQ-MDAI-001, not completion of every phase in the preserved audit. Remaining plan work includes general operation receipts for all writes, the full multi-store operational workspace, broader legacy admin analytics/cohort/geography corrections, exports/projections when required, production restore/shadow/performance acceptance, provider inquiry acceptance and the externally gated integrations/assistant phases. No production migration, deployment, commit or push occurred.
