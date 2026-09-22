# CP-10.13 — Navigation, rating rows, localization and onboarding reference data

## Scope and behavior

The customer header now spans the viewport, centers the existing Loqme symbol with only `Loqme` underneath, and switches to a translucent blurred background after scrolling. Desktop navigation and account actions occupy opposite sides. Compact mobile labels preserve touch targets without shifting the logo; mobile bottom navigation and portal access remain available.

Merchant ratings use horizontal progress rows with Persian labels, individual response counts and one-decimal scores, plus an overall review summary. The same component appears on merchant profiles and inside the listing's main content. Listing details receive the same backend review aggregation as merchant profiles; missing scores still show an empty state. Values remain based on all real reviews, not invented examples or a fabricated six-month window.

Listing dietary/allergen codes are translated into Persian, including halal, vegetarian, vegan, gluten, dairy, eggs, nuts, soy and sesame. Existing Persian descriptions are preserved. Unknown codes prompt the customer to ask the merchant instead of asserting an unsupported dietary/safety claim.

Production `/api/business/cities` returned HTTP 200 with an empty array. Migration `20260922010000_launch_city_reference` adds only the documented Urmia launch city and West Azerbaijan province when absent. Existing IDs and names are preserved, repeat execution is a no-op, and no accounts, merchants, listings or reviews are seeded. The city endpoint can return Urmia's map center without requiring demo neighborhoods or merchant locations.

## Local shop failure and repair

The existing local merchant endpoint returned HTTP 500 because the local `Review` table lacked the CP-10.12 columns. The onboarding schema was also present without a migration ledger entry, and lacked its coordinate check constraint. A custom-format backup was copied into ignored `.artifacts/cp1012/local-before-cp1013.dump`, its archive listing checked, and SHA256 recorded before changes. Existing onboarding columns, enum, indexes, nullable pickup fields and foreign keys were inspected; no application rows violated the coordinate bounds. The missing check was added, the existing onboarding migration recorded as applied, then review and city migrations applied successfully. No local records were reset or reseeded.

Actual local listing and merchant endpoints now return HTTP 200 with all five aggregate keys. Production did not expose any merchant profiles to reproduce that record-specific error; no production records were fabricated for verification. Developers should apply committed migrations before running updated application code; use migration history reconciliation only after verifying the actual schema and taking a backup.

## Validation and release

- Fresh disposable `loqme_onboarding_test_cp1013_final`: all nine migrations applied. Before fixture seeding: one city, zero merchants and zero reviews. Reapplying the city SQL inserted nothing and left one Urmia row.
- **232/232 tests in 26 suites** passed after isolated fixture seeding.
- Five new browser checks pass on the development server at 360/390/768/1440/1920px, covering centered/full-width header, scroll blur, translated tags, real rating layout and zero axe WCAG A/AA violations. Screenshots visually inspected.
- Production build, lint and web/shared typechecks pass. Full production-browser regression and deployment verification are in progress.
- CP-10.12 animation/cache follow-up `b40ff1f` deployed successfully in run 35658162949 after a registry timeout retry. Its early-frame and stale-CSS regressions remain part of browser acceptance.

Live SMS, dedicated Map.ir credentials, real-device acceptance and previous commercial gates remain open.
