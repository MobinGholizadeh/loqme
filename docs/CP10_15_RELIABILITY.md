# CP-10.15 — Search, merchant loading and mobile reliability

User-authorized follow-up (2026-09-24): restore business place search, investigate map-to-merchant loading, correct mobile form zoom/overflow and programmatic heading outlines, reduce footer height and improve responsive photo delivery. SMS.ir account setup is explicitly deferred by the user; application delivery failures must still be reported truthfully.

## Findings and implementation

- Production store search returned 503 because `MAPIR_API_KEY` was missing. The already configured map key successfully returned real search results. Server search/reverse prefer the dedicated key and can use the existing configured map key as a fallback; keys remain in provider request headers.
- The normal development command did not load the repository `.env`, while Prisma and Docker did. The developer's app-local file lacked both map keys. Root `npm run dev` now loads the documented root file before Next; shell/Doppler settings retain priority. Environment files are not committed or copied into source.
- OTP issuance ignored a false delivery result and could fall back to console delivery. Failed delivery now invalidates the issued code and returns 503 with Persian feedback; throttling remains 429. Production never silently switches to console SMS. Live SMS delivery/account configuration remains deferred.
- Mobile form inputs use at least 16px text to avoid focus zoom; input flex children and business-type fieldsets can shrink within their container. Programmatic step-heading focus retains screen-reader navigation without a border or scroll jump. User zoom remains enabled.
- Footer spacing and wordmark size are reduced while retaining the Loqme reveal.
- Detail photos declare their actual full-width display size rather than using card sizes. New uploads preserve up to 2400px, compress as WebP and strip metadata; small photos are not stretched. Existing low-resolution uploads require replacement originals to gain real detail.

## Validation and release

35 focused tests pass; production build, lint and shared/web typechecks pass. All 86 browser regression tests pass on the optimized preview, including map-marker to store to product navigation, four-width onboarding bounds/axe checks, SMS failure feedback and compact footer. Mobile and desktop screenshots were visually inspected.

Commit `1eac59c` passed the disposable-database CI job, image build and production deployment in [run 35963057596](https://github.com/MobinGholizadeh/loqme/actions/runs/35963057596). Live search returned 10 results; mobile bounds and heading outline, 470px desktop footer, readiness and zero runtime errors were verified. Image delivery produced a 44,579-byte responsive AVIF from a 790,842-byte source.

Docker subsequently recovered. A real local approved merchant returns 200 with two products and rating aggregates. The specific previously failing merchant URL was not supplied. The release workflow gates image build/deployment on the full suite against a fresh disposable PostgreSQL/PostGIS service, applying fixture seeds only there. No production reseeding.

Follow-up 2026-09-27: production SMS runtime credentials repaired, permanent workflow fix deployed and real OTP request accepted. See [PRODUCTION_SMS_REPAIR.md](PRODUCTION_SMS_REPAIR.md); this supersedes the earlier SMS deferral.
