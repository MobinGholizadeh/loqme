# CP-10.8: Stitch UI Redesign

Branch: `codex/stitch-ui-redesign`, based on the current `master` checkout. Started 2026-09-13; final preview checks completed 2026-09-14. No deployment or merge is included. Existing logo-square, favicon, root layout metadata and manifest changes are retained.

## Reference Coverage

Stitch project: `4335349565403348576`. The 16 screen references are design input, not live marketplace data.

| Area | Desktop Reference | Mobile Reference | Routes |
| --- | --- | --- | --- |
| Discovery | `27e4a20c99ef4b3899ea82ae5b6e420e` | `400b6ca22cab48009a5e50c4456d90de` | `/`, `/explore` |
| Location/map | `a39b68dc6eec4d5fba9ceecec6dbb07c` | `cae77fb82d3c4691bdffc45bc542325b` | `/explore?view=map` |
| Login | `940b1442c4d94fc990fd79fc05cd7151` | `38c88f96a4d543c5a344b0a0c2253577` | `/login` |
| Bag/store | `32124f568c51414db369324a031c4366` | `4e8b13565c3f4bcdbadec269b456feef` | `/listings/[id]`, `/merchants/[id]` |
| Voucher | `bf5f6bc7c8d84273961040c5f632337c` | `e85af7ac47e447cab8ee338889993a74` | checkout, orders, receipt, pickup pass |
| Profile | `8d4f2a533cc54840bdb7467f18fdbc56` | Responsive adaptation | `/profile` |
| Merchant | `aec3374ff33e42ff8787909ceb3030a4` | `2261e6b4236f43108a295d04114b9f71` | dashboard, listings/form, queue/scanner, finance, staff, settings |
| Admin | `e25522500dc745b9ab609a1567a2b1ee` | Responsive adaptation | dashboard, merchants, customers, listings/categories, moderation/refunds, finance, analytics, audit, settings |
| Loading | `388076cac69c4322b09a9561ec539f46` | `87aeed56f66143b3a7e66d039195e2b7` | shared loading, skeletons; extended to errors, empty, offline, 404 |

## Adaptation Decisions

- White canvas, Loqme teal actions, charcoal text, restrained status colors; platform-neutral `@loqme/design-tokens` feeds root CSS variables and Tailwind. Existing logo artwork and licensed Vazirmatn are retained. Zero letter spacing.
- Discovery immediately requests real nearby inventory at the initial Urmia neighborhood. Both discovery entry points use `DiscoveryView`; neighborhood, category, query, radius, business type, maximum price and map/feed mode are URL state. Legacy `cat` normalizes to `category`.
- Nearby/search summaries and store active listings expose optional existing primary `imageUrl`. This is an additive presentation field, not a schema or business-rule change. Missing images receive an honest placeholder, never invented inventory photography. Browser fixtures use bundled photos only in isolated intercepted responses.
- Profile uses session and order endpoints. Unsupported impact claims, referral/social-login controls, invented savings and fake service-health claims are omitted.
- Native dialogs provide focus containment, Escape/backdrop handling and focus restoration. Purchase bars clear mobile navigation; tables retain horizontal scrolling instead of hiding operational columns.
- Receipt status is derived from the returned order, not a payment query parameter. Pickup credentials, rotating tokens, OTP, merchant checks and payment processing remain backend-authoritative.
- Service worker excludes authentication, orders/profile, checkout, merchant/admin/API traffic and cross-origin requests. The install prompt is suppressed on transactional/portal screens.

## Baseline

- Web TypeScript: pass.
- ESLint: exit 0, six warnings.
- Vitest: 10 suites passed, 5 failed; 114 tests passed, 2 failed/timeouts, 34 skipped. DB-dependent suites could not connect to localhost:5432; Docker daemon unavailable. This is an environment limitation observed before edits.

## Validation Results (2026-09-13)

Playwright tests use signed local test sessions and intercepted API responses. They do not send SMS, charge a gateway or mutate the database. These checks validate UI behavior, not live provider integration or backend concurrency. Run against a dedicated development instance on port 3002 with `LOQME_BUILD_DIR=.next-stitch`; do not target a production host.

| Check | Actual Result |
| --- | --- |
| `npm run lint` | Pass: zero errors, zero warnings (baseline: six warnings). |
| `npx tsc --noEmit -p apps/web/tsconfig.json` | Pass. |
| Explicit `tsc --noEmit` for `packages/api`, `design-tokens`, `types`, `validation` | All four pass. Root workspace typecheck alone is not treated as coverage. |
| Full Vitest, isolated PostgreSQL | **16 suites, 160 tests pass** with `npm test -- --no-file-parallelism`. All database-backed tests ran; no skips. Initial DB-offline run had 124 pass, 2 timeouts and 34 skipped. |
| Database-independent Vitest subset | 11 suites, 115 tests pass, including 10 new redesign tests for tokens, summary images and private-cache exclusions. |
| Production build | Pass, 33 static pages generated and standalone output traced. Final builds use the restored PostgreSQL connection and generate the dynamic sitemap successfully. |
| Browser regression | **22/22 tests pass** against the optimized preview, including 27-route accessibility/responsive sweeps and real service-worker offline behavior. Final decoded-image checks are included in the viewport matrix. |
| Axe | No WCAG 2 A/AA or 2.1 AA violations in 27 route states, plus review, complaint and refund dialogs. This is automated coverage, not a claim of complete accessibility certification. |
| Responsive matrix | 27 routes at 360, 390, 768, 1440 and 1920px: no document overflow or uncaught page errors. Visible non-map images are required to decode. |
| Screenshots | All 27 route states captured at 390 and 1440px in ignored `test-results/redesign-route-matrix-at-{width}px/`. Selected discovery, map, voucher, checkout and portal screenshots visually inspected against the reference layouts. No pixel-perfect similarity score is claimed. |
| `git diff --check` | Pass. |

### Lighthouse

Mobile lab runs against the optimized local server using Lighthouse 13.4.1 and a dedicated headless Edge instance. Homepage measures the real empty-inventory state, not a populated catalog. These are local lab results, not field/Core Web Vitals guarantees.

| Route | Performance | Accessibility | Best Practices | SEO | CLS |
| --- | --- | --- | --- | --- | --- |
| `/` | 94 | 100 | 100 | 100 | 0 |
| `/login` | 94 | 100 | 100 | 100 | 0.001 |

The first homepage run scored 77 performance/98 accessibility with CLS 0.218. Reserving full-viewport main-content space fixed the loading/footer shift; sequential empty-state headings and the brand link's accessible name fixed the accessibility findings. Final homepage LCP was 3.0 seconds. Reports are retained in `.artifacts/stitch/lighthouse-home-final.json` and `lighthouse-login.json`.

The initial npx installation lacked a required Speedline module; the isolated audit harness in `.artifacts/stitch/lighthouse-tools` pins `speedline-core` 1.4.2. This tool-only workaround is not an application dependency. Windows temporary-profile cleanup errors were avoided by attaching Lighthouse to a dedicated headless browser.

The live PWA check found that caching only offline HTML left its Next.js route bundle unavailable. Service-worker cache v3 now preloads the fallback's same-origin `/_next/static/` assets during installation. The browser test verifies registration, absence of private/API responses in Cache Storage and a rendered offline fallback after disconnecting the browser.

Workflow coverage includes discovery URL normalization/history and filters; phone/OTP digit normalization, errors and resend; reservation, expiry, rejected checkout, truthful unpaid receipt; pickup token display/retry/polling; merchant publication, stock pause, pickup verification and staff invitation; merchant approval, customer blocking, reviews, complaints and confirmed refund requests. Dialog Escape/focus restoration, Persian numerals and reduced-motion states are checked. Backend financial calculations and pickup security are not reimplemented.

During verification, production image optimization exposed a missing `sharp` runtime dependency. Added `sharp` to `@loqme/web` and confirmed optimized image responses return HTTP 200. The initial cached 0.34.5 version had a high-severity advisory; it was upgraded to 0.35.4 before delivery. The npm registry was intermittently unreachable; the first package fetch used the npm mirror, while lockfile URLs remain canonical npm registry URLs with integrity hashes. No persistent registry setting was changed.

## Database Recovery And Test Isolation

The user started Docker and authorized application of the two existing pending migrations to local `loqme`: `20260910000000_pickup_verification` and `20260910010000_trust_safety_moderation`. Both applied successfully. No migration files or new schema changes were authored. A pre-migration custom-format backup is retained locally at `.artifacts/stitch/loqme-before-migrations.dump` (ignored by Git).

Integration validation uses a separate database, `loqme_stitch_ui_test_20260913`, created from the six existing migrations and `prisma/seed.ts`. Only this test database had pickup windows moved to the current test window and inventory increased to 100 units, because the legacy suites share seeded inventory and otherwise exhaust it. Tests ran serially with console SMS and mock gateways. No test mutations, seed refresh or inventory changes were applied to the user's `loqme` data.

One stale M04 assertion was corrected to expect `READY_FOR_PICKUP`, matching the existing M05 order service. No order state transition or payment logic changed. With complete schema and fresh test fixtures, all 160 tests pass, including database constraints, reservations, payment accounting, double-pickup concurrency, OTP lockout and cross-merchant authorization.

## Remaining Acceptance Checks

- PostgreSQL is now healthy. The user's database has 43 listings but zero unexpired published listings at verification time. The homepage correctly shows an empty result instead of expired offers. Refreshing or publishing merchant inventory is a business operation, not part of the redesign; no fixture data is injected into the preview.
- Chromium tile requests to CARTO were reset (`net::ERR_CONNECTION_RESET`). Map pins are framed and clickable; failed tiles have an explicit message and a usable store list on mobile and desktop. Successful live tile rendering on this machine is not certified. The browser report attaches tile availability separately.
- Physical-device PWA installation, camera scanning, real inventory photography and live SMS/payment integration require their actual environments. Browser fixtures do not satisfy those gates; database concurrency was separately tested on isolated PostgreSQL.
- Dependency installation reported existing security advisories. This checkpoint does not certify dependency security or include a framework upgrade.
- Lighthouse collection is recorded above; early npm/network failures and an incomplete npx installation were recovered with an isolated local audit tool installation. Scores are measured, not inferred.

CP-10.8 is **implemented and locally validated**. Physical-device/provider acceptance and fresh real-inventory imagery remain release checks, not claims made by the fixture suite. This branch is not merged or deployed.

## Reproduce And Preview

PowerShell, repository root:

```powershell
$env:LOQME_BUILD_DIR = '.next-redesign-build'
npm.cmd run build
node node_modules/next/dist/bin/next start apps/web --port 3003
```

In another terminal:

```powershell
$env:LOQME_TEST_URL = 'http://localhost:3003'
npm.cmd run test:browser
```

Without `LOQME_TEST_URL`, Playwright starts an isolated development build on port 3002 using `.next-stitch`. Keep test targets local; intercepted API responses and signed fixture sessions are not production test accounts. The current preview is `http://localhost:3003`. No deployment, merge or commit was made.

For full domain validation, initialize a **fresh disposable database** using the existing six migrations and seed, set `DATABASE_URL` to that database, and run `npm test -- --no-file-parallelism` with `SMS_PROVIDER=console`. The seed's clock-dependent pickup windows must be current; this run used start = now minus one hour, end = now plus three hours and 100 inventory units in the test database only. Legacy suites consume fixtures and create fixed-number orders, so rerunning them against already-consumed data is not equivalent to a fresh run. Never run this setup or these mutating domain tests against the preview or production database.
