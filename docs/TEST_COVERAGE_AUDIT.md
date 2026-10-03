# Coverage and regression repair — 2026-10-03

## Current result

The user requested 100% project coverage and defect repair. This remains **in progress**. The latest complete run passed **917/917 tests in 73 suites, with zero skips** against a fresh disposable PostgreSQL/PostGIS database. Instrumented coverage is **60.63% lines, 58.76% statements, 47.50% functions and 52.19% branches**. The strict 100% gate correctly exits nonzero. These figures do not include browser coverage.

Passing tests establish only the assertions and scenarios exercised. Even 100% line/branch coverage would not establish absence of bugs, all input combinations, correct business requirements or production readiness. Historical milestone completion percentages were not coverage measurements.

## Measurement

`npm run test:coverage` uses matching Vitest/V8 5.0.3 packages. Explicit includes retain unimported executable files: web `src/**/*.ts(x)`, shared package `src/**/*.ts(x)`, `public/sw.js`, and TypeScript/CommonJS runtime scripts. Only declaration files are explicitly excluded. HTML, JSON, summary, LCOV and console reports go to ignored `coverage/`. Lines, statements, functions and branches all require 100%; coverage was not narrowed to increase the score. Vitest 5 uses AST-based remapping, so percentages are not directly comparable to the first partial run using Vitest 2.

Static assets, CSS, SQL migrations, shell scripts and deployment configuration are outside JavaScript instrumentation and still need appropriate acceptance checks. Playwright runs separately. Deployment CI currently runs the ordinary test suite, not the coverage gate.

## Reproduced defects and repairs

- Order receipts required no authentication; reservation detail lacked ownership checks. Both now require sessions and customer ownership. Pickup credentials also reject non-admin callers without customer profiles instead of passing an undefined ownership filter. Sensitive successful detail responses are private/no-store.
- OTPs were issued with roughly 100-year expiry and had an expiry bypass. Issuance now expires after the advertised 120 seconds; consumption requires both a valid expiry and issuance within 120 seconds, including for legacy rows. Single-use redemption remains atomic.
- Production accepted mock payments; unimplemented gateways fell back to mock. Production checkout selects Zarinpal server-side, direct mock resolution throws in production, and unimplemented adapters fail closed.
- Zarinpal initiation/verification accepted success-shaped JSON even on failed HTTP responses. Both now require HTTP success. Mock amount checks reject nonpositive, fractional and unsafe numeric values.
- Refund processing accepted invalid or partial amounts despite full-order ledger reversal and fabricated successful refunds for adapters without refund support. It now requires a safe positive full-payment amount and an actual supported provider refund result. Refunded payments cannot be reverified into success.
- Raw inventory SQL compared UTC-naive Prisma timestamps against session-local `NOW()`. Explicit UTC expressions now preserve correct expiry behavior under non-UTC database sessions. Quantity validation rejects invalid requests.
- Checkout lost valid zero commission and reported success on failed retry initiation. It now preserves zero commission, requires approved safety state and pending-payment status, and reports gateway failure.
- Concurrent successful callbacks could duplicate financial effects or reopen completed orders. Order completion now locks the order and atomically claims its live reservation, updates inventory, posts ledger transfers and increments savings. Existing completed/ready orders are idempotent. Failed inventory completion rolls back the reservation and financial effects.
- Pickup verification permitted unpaid, cancelled, refunded and no-show orders, accepted a call without customer proof, and allowed malformed signed QR payload types. These are rejected; unusable orders cannot obtain new pickup credentials.
- Pickup code consumption and order completion were separate writes. They now share a transaction with a conditional paid-order claim. A real-database injected storage failure verifies rollback and subsequent successful retry. No-show sweeps recheck eligible/uncollected state during mutation and report only actually changed rows.
- The no-show mutation endpoint allowed anonymous or invalid sessions. It now requires a valid non-customer session.
- Cancelled payment authorities could alter redirect query parameters; unsuccessful verification without an order produced an invalid receipt URL. Query values are encoded using URLSearchParams and unknown orders return to the order list.
- Backup integrity verification passed without a checksum. Missing checksums now fail. Backup tests do not claim to validate database restoration.
- Browser accessibility found profile metadata with 2.56:1 text contrast. Secondary text now uses the existing neutral-600 token; the complete accessibility route matrix passes after repair.

- Historical financial reports recalculated commissions using current rates and displayed fabricated bank details. Reports now use stored order commission/payout snapshots, preserve zero commission, avoid counting internal ledger transfers as customer sales, and show missing/unverified bank details honestly.
- Public merchant review queries exposed private customer/order fields. Explicit public selects now omit phone numbers, customer IDs and private order identifiers.
- Profile notifications included fabricated order/discount alerts. Defaults are empty and persisted legacy sample alerts are discarded. Persian/Arabic OTP digits are normalized before validation.
- CSV exports broke on commas, quotes, newlines and URI fragments, and allowed text to become spreadsheet formulas. Financial and analytics exports now escape cells and encode the complete download payload.
- Existing customers invited as merchant staff retained a customer-only role. Invitation now atomically grants the merchant role and store membership, preserving existing higher roles. Database tests verify tenant-scoped access and duplicate rejection.
- Payment service initiation/verification now rejects unsafe or nonpositive amounts before numeric conversion can change the amount sent to a provider.
- Concurrent refunds could call the provider multiple times. A payment-row lock and persisted REQUESTED refund claim now precede external transfer. Explicit provider rejection marks REJECTED and allows a new attempt. Exceptions or local finalization failures leave the claim pending for reconciliation; automatic retries cannot resend the transfer. Settled reversal and payment/order updates remain atomic.
- Browser installation dismissal left a nonfunctional install button; blocked localStorage and rejected prompt calls could also throw. The single-use event is consumed, and storage/provider errors are handled.
- A camera stream granted after scanner closure or lens switching could leak. Request generations discard stale acquisition/playback, and independently retained streams are stopped on cleanup/failure.
- Pickup credential requests could display a prior order after switching orders. Stale responses are ignored, failed HTTP responses are rejected, and unavailable clipboard access no longer causes unhandled errors.
- The listing form compared clock strings lexicographically and rejected a valid `9:00–10:00` window. It now compares numeric minutes; publication, preset, validation, safety-declaration and failure tests cover the form.
- Merchant clock inputs used the server timezone and normalized invalid hours/dates. A backend pickup-window parser uses Asia/Tehran with explicit validation; ISO timestamps require an offset and incomplete/expired windows fail.

## Test and dependency work

Added meaningful assertions across shared API transport, gateway failures, payment/refund boundaries, database concurrency and timezone behavior, reservation/order/pickup boundaries, customer/admin API authorization, authentication, service-worker privacy/offline behavior, session races, controls/dialogs, image recovery, review/complaint forms, audio feedback, logging/redaction and backup retention/integrity.

Vitest and coverage tooling were upgraded together to 5.0.3; React Testing Library and jsdom support interaction tests. Lockfile upgrades include Next 16.3.8. Scoped overrides remediate Prisma's transitive `deepmerge-ts` (8.0.2) and `mysql2` (3.24.5) advisories. Prisma generation, config loading, migrations and real PostgreSQL tests passed with these overrides. `npm audit` currently reports **zero findings**, not a guarantee that no unknown vulnerability exists.

## Execution evidence and environment

- Full fresh-database run: `.artifacts/coverage-complete12.log`, 917/917 tests, 73 suites, no skips; coverage gate fails only on unmet thresholds.
- Latest detailed coverage: `coverage/index.html`, `coverage/coverage-summary.json`.
- Browser run: `.artifacts/coverage-browser-latest.log`, 95/95 passes with all substantive changes except the subsequent one-line listing clock-comparison correction. Both affected publication tests pass after that correction in `.artifacts/coverage-listing-browser-verified.log`. An earlier focused attempt used a mismatched fixture signing key and was discarded after correcting the test environment. Real database-backed login was enabled. Most browser scenarios mock APIs; these are not evidence of live payment-provider behavior.
- Latest production build passed in `.artifacts/coverage-build7-limited.log` with two workers (`CIRCLE_NODE_TOTAL=3`) after earlier Windows virtual-memory exhaustion with the default 19 workers. Run heavy build and coverage jobs sequentially on this host.
- Lint passes: `.artifacts/coverage-lint-final-current.log`. Web/shared types pass after restoring generated preview configuration: `.artifacts/coverage-types-final-current.log`. Audit: `.artifacts/coverage-audit-final.json`.
- Docker Desktop could not start. Automatic approval review rejected removal of its stale inference socket; it was not removed. An independent WSL PostgreSQL 18.6/PostGIS 3.6.2 cluster on port 55432 enables tests without resetting Docker. Database session timezone is Asia/Tehran. Deployment PostgreSQL version differs; matching-version CI acceptance remains relevant.
- Only databases named `loqme_onboarding_test_coverage*` were migrated/seeded for these runs. No main or production database was targeted. No commit, push or deployment was performed.

## Reproduction and remaining work

Create a **fresh disposable** PostgreSQL/PostGIS database named `loqme_onboarding_test_<unique-suffix>`, explicitly set `DATABASE_URL` to it, `SMS_PROVIDER=console`, and a test-only `SESSION_SECRET`. Run `npm run db:generate`, `npm run db:migrate:deploy`, `npm run db:seed`, then `npm run test:coverage`. Existing integration tests mutate seed fixtures; reuse is not equivalent to a fresh full run. Never target the application or production database.

Substantial gaps remain, particularly page interactions, maps, merchant/admin workflows, API error paths and scripts. The coverage report is the worklist. Continue adding behavior assertions and repairing reproduced defects until the requested thresholds pass; do not hide untested source or relax thresholds. Complete final type/build/browser checks after changes and update this document with exact results.

Operational gates remain independent: real PSP/SMS/device acceptance, load behavior, backup restoration, monitoring/rollback, and matching deployment database verification. Refund concurrency has database regression coverage. Pending/uncertain refunds still require a provider reconciliation process; they deliberately cannot be automatically retried. Live provider acceptance remains unverified. No full-coverage or production-ready sign-off is made.