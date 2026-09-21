# CP-10.12 — Reviews, availability, map controls and explainer

## Contracts

Reviews retain required `overallRating` and accept nullable `collectionRating`, `qualityRating`, `varietyRating`, and `quantityRating`. Each supplied score must be an integer from 1 through 5. The web form requires explicit selection of all five scores; legacy API aliases and omitted category scores remain supported. `valueRating` remains in storage and legacy input contracts but is no longer requested from customers. Migration `20260921010000_review_dimensions` preserves existing values and does not backfill scores.

Merchant profiles receive server aggregates over all review rows, independently of review pagination. Each category has its own non-null count and nullable, one-decimal average. Empty categories show «هنوز امتیازی ثبت نشده». Completed-order ownership and unique order reviews remain enforced. Review insertion and cached merchant total updates serialize on the merchant row within one transaction.

Public discovery, search and merchant listings include `PUBLISHED` and `SOLD_OUT` offers only for approved merchants, approved food safety and an open pickup window. Visibility is independent of stock. Server-derived `availability`, `remainingQuantity` and `canReserve` distinguish `AVAILABLE`, `RESERVED`, `SOLD_OUT`, `EXPIRED` and `UNAVAILABLE`. Unavailable cards remain clickable with «ناموجود», explain held versus sold stock, and block reservation. Map stores remain visible with zero active offers. Clients refresh on focus and reservation failures.

Temporary holds do not change a listing to `SOLD_OUT`; only actual sales exhausting total stock do. Conditional release and reservation status changes share a transaction, so concurrent expiry sweeps cannot release stock twice. Release/restocking reconciles eligible offers without reopening paused, unsafe or expired inventory. Stock edits use inventory version and listing-status checks to reject stale concurrent changes. Atomic reservation SQL also checks merchant approval, listing publication, food safety and pickup expiry.

The map wrapper owns an isolated stacking context. Leaflet controls, fallback messages and selected-store previews stay below sticky navigation and dialogs.

The homepage card and footer button «لقمه چطور کار می‌کند؟» lazy-load an original, silent 30-second guide. Four scenes explain discovery, reservation/payment, scheduled QR/OTP collection and enjoyment/review. Playback requires user action, pauses when hidden, stops on close and supports pause/replay/previous/next/seek. Reduced-motion users get manually navigable static scenes. No MP4 or third-party artwork is required.

## Validation (2026-09-22)

- Fresh disposable PostgreSQL database `loqme_onboarding_test_cp1012_release2_20260922`: all migrations and seed succeeded; **230/230 tests in 25 suites** passed, including 12 new review/inventory acceptance cases. Production data was not seeded or changed by these checks.
- Production Next.js build passed. Web and shared package typechecks and zero-warning ESLint checked with the repository's installed versions (Node 24, Next 16, React 19, Prisma 7).
- **64/64 Playwright tests passed** on the optimized preview, including 13 new CP-10.12 tests, review submission, map overlap/fallback, unavailable checkout and focus refresh, playback, keyboard/focus restoration and reduced motion. Merchant and explainer screenshots were inspected at 360/390/768/1440px; their axe checks report zero WCAG A/AA violations.
- Deployment YAML parses and its remote shell script passes Alpine `sh -n`. A containerized command-failure simulation passed backup failure, migration failure, readiness rollback and successful release paths. Production Compose configuration validates with disposable placeholder credentials.
- Local Docker build encountered Alpine package-repository TLS verification failures. TLS checks were not bypassed. GitHub subsequently built and published the production image successfully, and the deployed container passed database readiness.

## Deployment and recovery

The workflow serializes production releases and pulls the immutable image digest. It preserves the previous running image, creates a private custom-format PostgreSQL backup, verifies its archive table of contents and SHA256 checksum, then applies migrations in a one-off new-image container. Backup or migration failure stops before replacing the app. The replacement must pass database readiness; failure restores the prior app image and retains the migrated schema. Images are not pruned by deployment.

Schema changes preserve historical data and old write contracts. Recovery must retain the new nullable schema: pre-CP-10.12 Prisma clients assumed non-null quality/value scores and may not read new reviews with missing scores. After new reviews have been accepted, prefer a forward fix or a rollback build generated against the current schema; do not fabricate scores or restore an old database over live orders. The previous image is retained for immediate deployment recovery.

Live SMS, dedicated server Map.ir credentials, real-device onboarding acceptance and existing commercial/provider gates remain open. This checkpoint does not certify those gates.

## Release status

Released commit [`32c557e`](https://github.com/MobinGholizadeh/loqme/commit/32c557e66efd341a8e992b888634db074acc5cb9) to `master`. [GitHub deployment run 35655051067, attempt 2](https://github.com/MobinGholizadeh/loqme/actions/runs/35655051067) passed both image build/publish and remote deployment. Attempt 1 failed before compilation because Docker Hub timed out downloading BuildKit; retry succeeded.

Server logs confirm the backup checksum passed, `20260921010000_review_dimensions` applied successfully before replacement, and database readiness passed at 2026-09-21 21:12:36 UTC (2026-09-22 Tehran). Deployed image digest: `sha256:e093f324be84562bf9afc55162846bb01f1db7f0ee8eea63cacce073f2df5fa0`.

Public `https://loqme.shop/`, `/api/health/live`, `/api/health/ready`, discovery, search and sitemap returned HTTP 200. A real production browser opened the guide and verified play, pause, next scene and close. Public discovery had zero current offers and the sitemap exposed no approved merchant profiles, so live merchant/rating and unavailable-card checks could not exercise real records; those cases passed disposable-database and browser acceptance. No production records were fabricated or reseeded.


## Follow-up: first-load CSS and playback crash (2026-09-22)

The local development worker could serve old CSS under a stable Turbopack URL. PWA registration is now production-only; development removes only Loqme registrations/caches and reloads a previously controlled page once to release it. Production worker v4 fetches styles network-first with an offline fallback and retires only older Loqme caches.

Playback now initializes its clock from the first animation-frame timestamp rather than mixing that timestamp with `performance.now()`. A frame can start before the effect runs; subtracting those clocks previously made elapsed time negative and indexed scene -1. Elapsed time and scene bounds now remain nonnegative.

Validation: 16/16 focused production-browser tests passed (including stale stylesheet recovery and early-frame regression), plus the early-frame test against the actual development server. A browser with a preinstalled local worker recovered automatically and retained an unrelated cache. Production build, web/shared typechecks and lint pass. Existing database acceptance remains unchanged; this follow-up contains no schema or backend changes. Release verification is pending push/deployment.
