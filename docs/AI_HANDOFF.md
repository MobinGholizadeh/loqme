# AI handoff — Loqme authentication / business onboarding

Last updated: 2026-09-21. Read this together with `AGENTS.md`, `PROJECT_STATUS.md`, `AUTH_ONBOARDING.md`, `ROADMAP.md` and `milestones/M10-polish.md`. Inspect Git before changing anything; repository state overrides this snapshot.

## Where we are

- Historical M00–M11 implementation is complete, but this is a **new CP-10.11 checkpoint**, not a deployed release.
- The user pushed Stage 1 as `ea129ac` (`checkpoint for login/signup refactoring`). The working tree was clean when Stage 2 began.
- Current branch at continuation: `feature/mapir-tile-integration`. Do not assume `master` or create a replacement branch without a task reason.
- Stage 1 contains the main full-screen auth/onboarding UI, shared contracts, Map.ir API adapter, separate merchant applications/migration, admin approval and nullable pickup windows.
- Stage 2 hardens and validates that implementation. It fixes the native-input TypeScript error, coordinate editor closing during typing, rejected draft overwrites, closed-day settings validation, mobile photo stretching, production offline-auth fallback and OTP replay/concurrent consumption. Request/provider bodies now have streamed byte limits; unavailable provider/search still allows manual entry.
- Stage 2 changes are local/uncommitted unless Git shows a subsequent user commit. This continuation has not pushed, deployed, migrated the main database, or edited secret environment files. Do not claim otherwise.

## When the user says “continue”

1. Check `git status`, latest commits and updated PROJECT_STATUS. Preserve user edits and the existing Map.ir integration. Do not rebuild the already implemented flow from scratch.
2. Finish any outstanding acceptance items recorded below. If all local tests are green, prioritize the runtime/provider and actual-device gates; do not invent more unrelated features.
3. Ask the user to configure a **server-only `MAPIR_API_KEY`** in the untracked environment (`apps/web/.env` for native Next preview; root `.env` for Compose), then restart only the relevant local preview. Never ask them to paste secrets into documentation or commit them. The existing public tile key must remain for Leaflet, but the server adapter intentionally does not fall back to it. Test search/reverse through Loqme's actual APIs once configured; confirm manual fallback without that key.
4. Validate the real-device mobile keyboard and live SMS transport when those resources are available. Desktop resized viewport tests are not real iOS/Android keyboard certification. No password authentication is requested.
5. If the user requests push, inspect/stage only scoped source, tests and docs; exclude `.env`, test screenshots/reports and `.next-*`. Commit the checkpoint with honest validation notes and push only the intended branch. No force push or automatic production deployment.
6. If deployment/main DB migration is requested, plan backup/migration explicitly. Do not run seed/reset on the main database. Approved applicants must authenticate again to obtain a merchant-role JWT; choosing a Map.ir result never grants ownership.

## Validation snapshot

- Prisma client generation succeeds (the previous DLL-lock issue is no longer present).
- **218/218 Vitest tests, 24 suites**, passed serially on fresh `loqme_onboarding_test_acceptance_20260921`; migrations + seed were applied only there. Includes real application/approval races, cross-account access, unsupported city/forged fields, concurrent duplicate claims and real-DB OTP single-use/expiry/attempt limits.
- Explicit web TypeScript, four shared package typechecks, zero-warning lint and the final `.next-onboarding-build` build pass, including the logout/copy changes.
- **51/51 browser tests pass on the final optimized preview**, including 18 onboarding tests and 33 existing regressions. This covers logout clearing, stale-search cancellation, real cache/index headers, admin-review dialog axe and the six viewport sizes. An earlier test-only selector ambiguity (marker plus result row) was narrowed to `.business-results` before the successful full rerun.
- Screenshots were manually inspected at all six requested widths: 360, 390, 768, 1024, 1440 and 1920px. Automated entry-page checks additionally cover reduced motion, keyboard skip link and a 390×420 resized viewport. Browser authentication/provider/admin mutations use fixtures; backend security tests use actual disposable PostgreSQL.
- Live Map.ir reverse smoke returned HTTP 200 and `address_compact`, city `ارومیه`; Stage 1 search smoke returned HTTP 200 `value[]` points with longitude-first coordinates and no provider ID in the sample. No fabricated hours/phone/license or ID fallback is used.
- Existing M04/M05 suites mutate shared seed listings and leave rows behind. Parallel suites raced on inventory; reused databases conflicted on old fixed order numbers. For full acceptance use **fresh disposable DB + `vitest run --no-file-parallelism`**, not production-data resets. Expected Prisma write-conflict messages in application concurrency tests are retries, not failed assertions.

## Local operational state

- Docker Desktop was started in the background. `loqme-postgres` provides disposable PostgreSQL.
- Development preview was started on port **3004** with `.next-onboarding`; optimized preview uses **3005** with `.next-onboarding-build`. Both target `loqme_onboarding_test_20260920`, not the main DB. Check process/port liveness before reuse. Do not kill unrelated Node/Docker processes.
- Disposable DBs retained: `loqme_onboarding_test_20260920`, `loqme_onboarding_test_20260921`, `loqme_onboarding_test_final_20260921`, `loqme_onboarding_test_acceptance_20260921`. They contain only seed/test data but are not clean rerun baselines. No databases have been deleted by this task.
- Generated build outputs and screenshots are ignored. Next may append its preview type directory to `apps/web/tsconfig.json`; do not mistake this for a business-logic change.
- Windows Node/npm commands may require sandbox escalation because Node otherwise reports EPERM reading the user directory. Use `npm.cmd`/`npx.cmd`; never print environment secrets.

## Main implementation locations

- UI: `apps/web/src/components/auth`, `components/business`, `/app/business`, `/app/login`, customer shell/navbar and admin merchant applications tab.
- Domain: `apps/web/src/domain/business/application.service.ts`; server adapters/body/auth helpers: `apps/web/src/lib/business`.
- Contracts: `packages/types/src/business.ts`, `packages/validation/src/business.ts`, `packages/api/src/index.ts`.
- Persistence: `prisma/schema.prisma`, migration `20260920010000_merchant_applications`.
- Tests: `tests/business-*`, `tests/auth-single-use.test.ts`, `tests/browser/business-onboarding.spec.ts`, extended PWA test.
- Canonical API/model/security and limits: `docs/AUTH_ONBOARDING.md`, `DATA_MODEL.md`, `SECURITY.md`.

## Outstanding launch/acceptance gates

Dedicated server Map.ir key and API-level live smoke, actual-device/assistive-technology acceptance, live SMS/provider configuration, and shared rate limiting for multiple replicas. Deployment is outside the user's implementation request. Keep CP-10.11's remaining acceptance gates explicit even when code and local tests are complete.
