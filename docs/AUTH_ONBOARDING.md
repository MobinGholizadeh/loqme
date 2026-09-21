# CP-10.11 — Full-screen authentication and business onboarding

Updated: 2026-09-21. Stage 1 baseline: `ea129ac` (user-pushed). Stage 2 is a local continuation, not a deployment.

## Approved scope

The user's approved checkpoint explicitly extends historical M10 scope to authentication, application persistence and administrative approval. The historic M00–M11 completion claims do not certify this change.

- `/login`: customer mobile / five-digit SMS OTP, validated internal checkout/return destination.
- `/business`: first-store application, also available to signed-in customers. Returning owners/staff use the prominent `/business/login` link.
- `/business/status`: pending summary, administrator rejection reason and correction link, or approval with fresh SMS sign-in to obtain a merchant JWT.
- Desktop from 1024px: equal edge-to-edge image-left/form-right columns, sticky image, RTL form around 440px wide. Smaller screens: 230px photo banner, 24px form gutters, normal scrolling. Existing lifestyle photograph and white Loqme logo only.
- Anonymous navbar exposes both Persian customer/business actions; authenticated account/portal links remain.
- Five registration steps: configured city (Urmia default) and Map.ir search/manual fallback; six existing categories; editable details and position; explicitly confirmed Saturday–Friday hours; owner name and verified account. One same-day interval per open day, at least one open day.
- Noncredential fields only use versioned 24-hour session storage. Drafts are removed on successful submission/logout. Rejected-application recovery does not replace a restored or edited draft. Owner identity and OTP are not persisted in this draft.

## API contracts

Shared DTOs: `packages/types/src/business.ts`. Strict schemas: `packages/validation/src/business.ts`. Platform-neutral fetch methods: `apiClient.business` in `packages/api/src/index.ts`. Browser storage stays in `apps/web/src/lib/business/draft.ts`.

| Method / route | Input | Authorization / result |
| --- | --- | --- |
| GET `/api/business/cities` | None | Configured DB cities with province and optional center |
| GET `/api/business/places/search` | `q` (2–100 chars), `cityId` | Public, rate-limited; normalized name/address/coordinates and nullable provider ID |
| GET `/api/business/places/reverse` | `latitude`, `longitude` | Public, rate-limited; optional address/city/province; never silently replaces entered address |
| GET `/api/business/application` | None | Current active authenticated applicant's application or null; ignores forged account query parameters |
| POST `/api/business/application` | Strict `MerchantApplicationInput` | Current verified account; first-store CUSTOMER only for new/rejected submission; existing pending/approved response is idempotent |
| GET `/api/admin/merchant-applications` | Bounded `page` | Active ADMIN, 20 items/page with applicant mobile and possible duplicates |
| PATCH `/api/admin/merchant-applications/:id` | `decision`, `reasonFa` (5–1000 chars), `expectedRevision` | Active ADMIN; stale review gets 409; repeated same decision is idempotent |

Success envelope: `{ success: true, data }`. Errors: `{ success: false, message, details? }`. Business APIs send `Cache-Control: private, no-store`; business pages force dynamic rendering, noindex/nofollow, robots exclusion and service-worker bypass. JSON mutation bodies are bounded to 32,000 streamed bytes and foreign Origins are rejected. Cookie and Bearer authentication reuse existing transports.

## Map.ir integration and operations

- Server adapter uses only `MAPIR_API_KEY`, never a browser fallback. Existing `NEXT_PUBLIC_MAP_API_KEY` remains the separate Leaflet tile configuration. Existing marketplace Map.ir work is preserved.
- Search: POST `https://map.ir/search/v2` with `{ text: query + cityName }`. Only actual point results with usable Iranian coordinates are normalized. `geom.coordinates` is longitude first. A missing provider ID stays null (a UI list key is not a provider identifier). No hours, phone or license are invented.
- Reverse: GET `https://map.ir/reverse?lat=...&lon=...`; address suggestion requires an explicit Apply action.
- Provider timeout: 8 seconds; streamed response cap: 500,000 bytes; up to 10 search results. Per-process minute limits: 30/client and 300/global, with bounded counters. Reverse and search share the budget. Client search debounce is 350ms with AbortController/stale-response protection.
- Missing permission/key, invalid response, timeout or no results retain manual entry. Geographic search is biased by city text; selecting a result is not proof of ownership or a city-boundary verification.
- References: [Map.ir Search v2](https://help.map.ir/documentation/searchv2-docs/), [Map.ir reverse API](https://help.map.ir/reverse_api/).
- Live smoke evidence: search HTTP 200 in Stage 1 returned `value[]`, `title`, `address`, `type: point`, `geom.coordinates`, and no provider identifier in the observed sample. Reverse HTTP 200 on 2026-09-21 at an Urmia coordinate returned `address_compact`, `city: ارومیه`, province and geom. Secrets were not printed. The smoke used the existing configured provider credential in a server process only.
- **Runtime gate:** a dedicated server `MAPIR_API_KEY` still needs configuring locally/in the deployment environment. Environment files were not edited or committed. Current isolated previews correctly take the manual-entry fallback when it is absent. Production multi-instance rate limiting needs a shared limiter or gateway enforcement; current counters are explicitly per-process.

## Persistence and security

Migration: `20260920010000_merchant_applications`. `MerchantApplication` has a unique applicant, validated store details/city/coordinates, optional provider ID/phone/license, weekly JSON hours, status/reason/reviewer/time, revision and unique resulting merchant reference. Pending applications are not public merchants.

Submission uses an applicant advisory transaction lock. Reviews use a global transaction lock plus serializable retries. Approval atomically creates an approved merchant, location, owner membership, all seven hours, account role/name update, application result and audit row. Commission comes from the database/server default. Matching provider IDs or normalized Persian name + nearby location block duplicate approval; existing store ownership is never replaced. Admins must validate ownership independently.

`MerchantHours.defaultPickupStart/End` are nullable and approval leaves both null. Consumers show an unconfigured state; settings accept closed days with blank times and reject partial or reversed pickup windows.

Stage 2 fixes existing OTP replay: PostgreSQL is the sole code authority, latest code only, atomic conditional consume, expiry and five-attempt cap. Database failure does not dispatch a memory-only OTP. Production user lookup cannot fall back to demo identities. Request throttling remains the existing per-process 3 requests/10 minutes; production SMS/provider and distributed-abuse controls remain operational gates.

## Validation evidence

- Prisma generate and schema migration deployment succeeded on disposable databases only. No primary DB migration, reseed or merchant ownership change.
- **218/218 Vitest tests across 24 suites** passed on fresh `loqme_onboarding_test_acceptance_20260921` with `--no-file-parallelism`, including provider-failure, competing-applicant and real-DB OTP cases. Final browser totals are recorded in PROJECT_STATUS and AI_HANDOFF.
- Existing DB suites share mutable seeded listings and leave rows behind. Parallel execution produced an inventory assertion race; rerunning a used database produced stale order conflicts. Use a freshly created/seeded disposable DB and serial suites for repeatable acceptance. Never reset the primary DB to make tests pass.
- **51/51 browser tests pass on the final optimized preview**: 18 onboarding tests and 33 existing regressions. Includes cache/index exclusions, stale searches, logout/draft expiry, admin-review dialog axe and a 390×420 keyboard-height simulation. The six-width matrix covers 360, 390, 768, 1024, 1440 and 1920px; entry screens receive axe WCAG A/AA checks, reduced-motion mode and keyboard skip-link checks, and screenshots at each width were manually inspected. Browser provider/auth/review flows use deterministic fixtures; server authorization/concurrency uses real PostgreSQL.
- Explicit web TypeScript, all four shared package checks, zero-warning lint and optimized `.next-onboarding-build` production build pass. Browser screenshots/traces are under ignored `test-results/`, not committed assets.
- Actual iOS/Android keyboards, screen-reader hardware, live SMS delivery and production Map.ir key restrictions are not certified by desktop emulation. No deployment or new production sign-off is implied.
- Actual optimized local API smoke: search/reverse return 503/manual fallback while the server key is absent; unsupported city returns 400; unauthenticated application/admin reads return 401. All checked responses carry `private, no-store` headers.

## Local preview

During continuation: development `http://localhost:3004`, optimized preview `http://localhost:3005`, both on disposable `loqme_onboarding_test_20260920`. Verify processes before reuse; do not assume these ports remain running. All `loqme_onboarding_test_*` DBs are disposable test artifacts; none was dropped by this task.
