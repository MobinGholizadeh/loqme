> **Current direction (2026-10-16, CP-10.25):** [WHITE_TEAL.md](WHITE_TEAL.md) supersedes earlier palettes below. White surfaces and navigation, logo teal feature sections, pale green canvas and a separate editorial homepage leading to `/discover`.

# Teal photography and glass — CP-10.24

The owner rejected the cream/ivory experiment and explicitly requested the previous photographic green-glass designs with the new customer food-pickup images, extending a matching background and palette throughout the web application. This is the current direction and supersedes both WARM_TEAL.md and the earlier white/bright-green rules.

## Visual contract

- Preserve the official logo files and use their dominant #1D616A teal for filled actions, with #174F56 hover and white labels.
- Use a #173F44 teal foundation, #214F54 content surfaces and #2D6266 raised states. Main text is #F7FBF5, secondary text #D2E3DD and borders #638D8A. Pale teal is used for readable links/focus/selection on dark surfaces, not as a competing brand color.
- Customer and portal shells use a fixed, softly blurred shop photograph behind teal overlays. Listings, forms and navigation use strong translucent panels; tables and dialogs use nearly opaque panels for readability. Photography stays decorative and never substitutes for live merchant/listing images.
- Keep the existing hero and its three pickup cards, compact footer, logo-only navigation, Persian RTL, Vazirmatn/DM Sans, Magic UI behavior and reduced motion. No device-dependent theme or switcher; browser controls/PWA chrome follow the single teal appearance.
- Preserve distinct semantic status colors, including readable error/warning panels. Do not globally invert media or tint QR codes.

## Authentication

Customer login and registration use the new coordinated food-pickup photographs: an adult leaving a local bakery with a kraft bag carrying the supplied Loqme symbol. Business login, all five registration steps and application status retain the business bakery photographs. Restore green-glass forms, light labels, white primary authentication CTAs with dark teal labels, and the white icon-only logo. Mobile keeps the photograph above the form.

Keep the existing image load/decode gate, cached-load handling, retry and explicit image-free fallback. The loader/fallback are teal. Unlike authentication, other pages do not wait for decorative photography: solid teal remains readable when it is delayed or fails. The shell backdrop is not attached to auth pages, avoiding a second decorative image download. Reduced-transparency preferences remove the decorative backdrop.

## Assets and performance

The built-in image-generation tool produced the new customer photos from the supplied logo reference. Original dimensions are 1672×941 and 941×1672; 3840×2160 and 2160×3840 delivery variants are upscaled, not native 4K detail. Mobile authentication variants are 37/89/244 KiB; desktop variants are 219/393/560/812 KiB. The shared blurred shell uses the 1920px desktop (393 KiB) or 960px portrait (89 KiB) file, reusing cached authentication assets. All assets are local.

The exact prompts, source filenames and generation provenance are retained in [WARM_TEAL.md](WARM_TEAL.md), whose cream interface direction is rejected. Originals remain in `.artifacts/warm-teal/sources/`; optimized images remain in `apps/web/public/images/auth/`.

## Compatibility and validation

The platform-neutral GREEN_DECK export and generateCssVariables("green-deck") identifier remain compatible; the classic default is unchanged. Existing authentication, checkout, merchant and admin behavior remains authoritative. No APIs, schemas, migrations or deployment change.

Record final tests and reviewed captures in PROJECT_STATUS.md and M10. Screenshots/logs live under `.artifacts/teal-glass/`. Fixture-based browser tests do not validate live SMS/payment/map providers.
