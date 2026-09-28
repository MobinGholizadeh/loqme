# CP-10.17 — Login persistence (2026-09-28)

## Report and diagnosis

The user completed production phone OTP verification, returned to discovery, then the mobile account link displayed login again. This follow-up is explicitly authorized, including delivery to master and production.

The account link already targets `/profile`. A read-only production probe confirmed middleware accepts a token signed with the running container's session secret, both directly and through the public host. It did not impersonate a real account. Protected HTML advertised `s-maxage=31536000`; anonymous session responses and protected redirects lacked explicit cache prevention.

An optimized-build browser regression reproduced the anonymous account redirect surviving successful OTP verification. The previous form optimistically trusted the verify response, then used `router.push` plus `router.refresh`. Changing a cookie in a route handler does not invalidate previously prefetched anonymous redirects in the client router.

## Repair

- Confirm the persisted HttpOnly cookie through an uncached session request before setting authenticated UI state or completing embedded onboarding.
- Start a new document at the validated, role-aware destination after login, clearing anonymous router state. Keep the embedded application form in place after confirmed authentication.
- If the cookie is missing, show a Persian recovery message instead of pretending login succeeded.
- Mark all session results, successful OTP responses, and protected middleware responses `private, no-store`; profile session reads explicitly bypass caching.
- Preserve 30-day sessions, OTP single-use rules, current-account status checks, safe internal redirects and merchant/admin authorization.

## Validation and release

269 tests across 31 suites pass on a freshly migrated and seeded disposable database. Production build, lint and web/shared typechecks pass. All 95 browser cases pass across targeted/regression runs, including the formerly failing anonymous redirect, real database-backed login/profile/reload/logout, missing-cookie recovery, merchant return links, six-width layouts and axe accessibility. Initial test-only expected destination/name mismatches and an artifact-directory collision were corrected and rerun. Production release verification is pending.

Browser fixtures now issue a cookie on successful verification and derive session state from incoming cookies. A separate opt-in local database browser test exercises the real verification route, cookie, session API, middleware, profile reload and logout; only SMS delivery and unrelated marketplace data are stubbed. Enable `LOQME_TEST_REAL_AUTH=1` with a localhost preview using the same `_test_` database. It never targets production or sends SMS.

No schema migration, production reseeding, account impersonation or production OTP bypass is part of this repair. The user's physical-device retest remains distinct from automated acceptance.
