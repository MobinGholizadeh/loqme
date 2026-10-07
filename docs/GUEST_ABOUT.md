# CP-10.20 — Guest browsing and About Loqme

## Behavior

- Customer login/register show «ادامه بدون حساب کاربری» on phone and OTP steps. This ordinary link navigates to `/` without sending SMS or creating a session. Business and embedded checkout forms omit it.
- Existing public discovery, merchant/listing pages and backend authentication boundaries are retained. Login still uses the existing validated return destination and persisted-session check.
- `/about` presents Persian brand introduction, the discovery/reservation/pickup journey, value, neighborhood businesses and food-safety policy using existing tokens, icons and typography. The shared footer links to it, and metadata/canonical/sitemap expose it publicly.
- Existing `SURPRISE_BAG` and `FLASH_DEAL` sections remain unchanged. Too Good To Go's [consumer marketplace](https://www.toogoodtogo.com/en-us/how-does-the-app-work) describes Surprise Bags; its [retailer platform](https://www.toogoodtogo.com/en-us/platform) handles expiry/markdown management. Research did not establish the requested exact-item local consumer flow, so the user-conditioned expansion is deferred.

## Editing the page

Edit `apps/web/src/content/about.ts` for all Persian editorial copy. Fill only verified public values in `business`: `legalName`, `registrationNumber`, `address`, `phone`, `email`, `hours`. Blank values and the entire empty business section are hidden. No CMS or database migration is introduced. SMS.ir approval has not been established; the owner must provide the required details and complete provider review.

## Validation (2026-10-07)

- `npx vitest run tests/otp-login-form.test.tsx tests/rbac.test.ts tests/session.test.ts tests/m10-ux-seo-pwa.test.ts`: 39/39 pass.
- Optimized-build Playwright: `guest-about`, `login-persistence`, `persian-seo`: 8/8 pass. Guest links navigate without OTP requests or session creation; anonymous reservation returns 401; orders redirect to login; business login omits the link. Persisted-login return navigation passes.
- About public HTML/canonical/sitemap and omitted empty business section verified; keyboard and zero axe violations at 360/390/768/1440px. Mobile/desktop screenshots visually inspected.
- `npm run build`, `npm run lint`, `npm run typecheck`: pass. Existing Next middleware deprecation and Vitest configuration warnings remain.
- Preview build/server and login fixtures used a matching isolated test session key because the local development default is intentionally rejected in production mode. No environment files or production credentials were changed.

## Release boundaries

The About text is present in server-rendered HTML. The existing root Next.js loading boundary keeps it behind a loading fallback when JavaScript is completely disabled; fully JavaScript-free navigation is not established by this checkpoint. Browser acceptance uses the supported JavaScript-enabled web/PWA/TWA clients. A broader loading-boundary restructuring is outside this change.

Applies to desktop, responsive mobile/PWA and the existing Android TWA after web deployment. There is no `apps/mobile` implementation in this checkpoint. No physical Android acceptance, production deployment or real SMS was performed. The local database is unavailable; public inventory browsing cannot be validated against live local inventory. Existing M11 coverage/provider/device gates remain open. Existing working-tree edits were preserved.
