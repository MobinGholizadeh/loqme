# CP-10.16 — Store photos and business finder

User-authorized follow-up, 2026-09-24. Match the supplied business onboarding reference with Loqme typography, Persian copy and RTL interactions.

## Implementation

- Merchant settings accept an owner-uploaded wide cover, displayed on the public store profile. The nullable `Merchant.bannerImageUrl` migration preserves existing rows and supports application rollback. Covers cannot be stock illustrations or another merchant's uploads. Existing storage authorization, bounded upload decoding, WebP compression and persistent volume apply.
- A cover is required before publishing or resuming offers. Registration/approval remains possible before uploading, so applicants without merchant access are not asked to upload through a privileged endpoint. The merchant completes their cover in settings before the first publication.
- All listing creation contracts now require a nonempty image; the legacy surprise-bag service persists it too. Owners/staff can add or replace existing offer photos. Edits lock the listing and leave exactly one primary photo under concurrency. Detail responses order the primary photo first. Existing records are retained, without invented merchant photographs or mass deletion; legacy offers must gain photos before republication/restocking.
- Business search accepts only known commercial POI classes in the selected city/county, matching the requested business name. Administrative points, streets, unknown POIs and other cities are excluded. Empty/provider-error states retain manual entry. Provider coverage still determines which businesses can be found; manual entry remains essential.
- The signup finder uses compact text result rows and a quiet manual-entry link. Desktop photography has rounded corners and an inset layout. The manual map has a fixed center pin, compact accessible controls, geolocation, an explicit confirmation button and collapsible keyboard coordinate editing. Tile failure preserves manual entry.

## Validation and release

266/266 tests in 30 suites pass against fresh disposable `loqme_onboarding_test_cp1016`. This includes missing images/covers, ownership, persistence, legacy edits, concurrent primary-photo selection, city/name filtering and previous domain regressions. Production build, zero-warning lint and web/shared typechecks pass. All 92 browser cases are validated: 89 passed in the full run; the publication fixture was updated to select its now-required image, and a fieldset minimum-width fix removed settings-page overflow. All three affected cases then passed on the final optimized preview. Four-width finder/map visual and axe checks pass; the final 390px cover/settings screenshot has no horizontal overflow. Release is in progress.

The local main database migration was applied only after a custom-format backup and `pg_restore --list` verification. A real approved local merchant returns HTTP 200, two listings and rating aggregates. No main or production reseeding occurred. Production SMS configuration was separately repaired and deployed as `afcd0fe`; see [PRODUCTION_SMS_REPAIR.md](PRODUCTION_SMS_REPAIR.md). Handset delivery confirmation remains pending.
