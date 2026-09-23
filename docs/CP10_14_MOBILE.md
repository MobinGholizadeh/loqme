# CP-10.14 — Mobile discovery and pickup presentation

## User-authorized scope

- Full-width teal footer with original Loqme wordmark, revealed once on entering the viewport; static under reduced motion. Links target existing product routes.
- Remove the persistent homepage guide card. Customer login shows a small dismissible guide suggestion; sessionStorage remembers dismissal for the tab session. The footer always retains a modest guide link. The animation stays lazy, manually started, silent and accessible.
- Mobile logged-in customers see no header account/business login actions. Existing root session lookup and focus/visibility refresh control this state. Guests get a compact phone-verification/login link with a return URL; bottom account navigation stays available.
- Keep the existing 30-day signed JWT and HttpOnly cookie lifetime. A session is issued only after SMS OTP verification; there is no email authentication or partially verified signed-in account in the current model. Do not invent a verification warning for an already verified customer.
- Listing photo has 44px circular back, share and favorite controls. Share uses native sharing with clipboard fallback and truthful failure feedback. Pickup dates/times use Persian locale and Tehran timezone, without falsely labelling future pickups as today.
- Add separate container/carrier-bag tiles and merchant pickup notes, plus the recommendation to bring a bag. False and unknown values are muted; unknown values explicitly remain unspecified.
- Always show overall score and four category bars. Missing scores render as 0.0 with an empty bar, with screen-reader wording distinguishing no reviews from an actual score. Authoritative aggregates and stored historical nulls remain unchanged.

## Packaging contract

Shared `PickupDetailsDto` and `PickupDetailsSchema` contain `containerProvided: boolean | null`, `carrierBagProvided: boolean | null`, and `instructionsFa: string` (trimmed, at most 500 characters). JSON is persisted under `ListingAttributes.key = pickupDetails`; no schema migration is needed. Missing or invalid historical attributes are read as unknown, never as provided.

The fast publishing form accepts packaging and pickup notes. Existing listings have a packaging editor in the merchant listing page. POST creates attributes atomically with inventory. PATCH validates and authorizes the current merchant, locks the listing row, replaces only the pickupDetails attribute and preserves other attributes, inventory, safety and publication state. Concurrent edits cannot create duplicate pickup attributes. A pickup edit cannot be combined with a stock/status mutation. Public listing detail and the authorized merchant list return the same parsed contract.

## Validation and release

- Fresh disposable `loqme_onboarding_test_cp1014`: 237/237 tests across 27 suites pass, including real persistence, public readback, cross-merchant rejection and concurrent edits.
- Production build, ESLint and web/shared typechecks pass. One transient Google font-loader failure passed on retry; existing Next middleware/edge warnings remain.
- Browser acceptance: 79/79 tests pass on the final optimized preview, including six-width auth/layout coverage and four-width footer/packaging visual/axe checks. Playback, cached stylesheet recovery, reduced motion, focus return, dismiss/reload, session refresh, merchant editor, existing checkout/review flows and role-scoped portals pass.
- UI release: `002a00a` pushed to master and deployed successfully in [run 35749616079](https://github.com/MobinGholizadeh/loqme/actions/runs/35749616079). Live footer, guide playback/login/dismissal, mobile guest notice, cities and readiness passed on 2026-09-23 with zero browser runtime errors.
- Follow-up: preserved newer SMS/Doppler commits. The subsequent e692978 workflow failed validation because it referenced secrets directly in an if condition. Corrected the condition, secret injection/SSH forwarding and staged environment replacement; removed embedded SMS/map credentials from deployment source. Follow-up image build passed; deployment safely aborted before app replacement because Doppler database credentials did not match the initialized database. Previous environment restored. The next follow-up preserves server-owned DB connection settings during app deployment; its CI is pending. SMS.ir credential rotation remains an owner action because the previous key exists in Git history.
- No production reseeding or fabricated reviews. Existing live SMS, map-provider and real-device acceptance gates remain open.

Deployment follow-up validation: workflow/Compose YAML and remote-shell syntax pass. An isolated stub harness checks failed Doppler download, failed migration, failed readiness with environment/image rollback, and successful replacement. These are controlled failure simulations, not failures induced on production.
