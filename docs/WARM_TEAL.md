# Rejected cream experiment — CP-10.24 history

> The owner rejected the cream/ivory interface. [TEAL_GLASS.md](TEAL_GLASS.md) is authoritative. The new food-pickup photography and its prompts/provenance below remain in use; the cream palette and light form directions do not.

Owner-approved application-wide direction, 2026-10-15. This supersedes the white/bright-green palette and forest-green botanical form styling. Green Deck remains the compatibility theme identifier, not a separate appearance.

## Palette and surfaces

| Role | Value |
| --- | --- |
| Logo-matched brand/actions | #1D616A |
| Hover/pressed | #174F56 |
| Canvas | #F3F0E7 |
| Cards/forms/dialogs | #FFFCF5 |
| Selection/supporting surfaces | #E1EBE7 |
| Main text | #203B3B |
| Secondary text | #526460 |
| Borders | #CDD8D1 |
| Action labels | #FFFFFF |

The dominant opaque teal in public/logo.png is #1D616A; the textured artwork contains nearby shades. Preserve official logo files. Use lighter teal only as supporting surfaces, not a new competing accent. Semantic success, warning and error remain distinct.

The platform-neutral GREEN_DECK palette supplies the web theme. Existing exports, theme name, CSS aliases and classic default remain compatible. Customer, merchant and admin pages use cream canvases with ivory cards. The existing homepage hero and pickup-step feature remain; the hero and compact footer are teal. Navigation stays cream and logo-only. Existing Magic UI effects, Persian RTL, licensed typography, focus handling and reduced motion remain. Browser/PWA colors are cream and color-scheme stays light; no theme switcher.

## Food pickup authentication

/login and /register replace the potted plant with coordinated photographs of an adult collecting a Loqme-branded kraft food bag from a neighborhood bakery. The bag uses the supplied logo reference; no real merchant or live inventory is represented by this decorative scene. Copy prioritizes discovering nearby food and value, with reduced food waste as supporting reinforcement.

/business/login, /business and /business/status retain their merchant bakery imagery. All entry screens now use ivory forms, charcoal labels, teal actions with white labels and a cream header with the colored icon-only logo. The loader and explicit image-free fallback share this palette. Responsive composition, image load/decode gating, cached-image handling, retry, the 12-second slow-load recovery, OTP and existing business behavior are unchanged.

## Artwork provenance and delivery

Generated using the built-in image-generation tool, referencing the official local logo. Desktop source: exec-ea6e984e-4829-4022-81ec-7a1d78f0bcf2.png (1672×941). Portrait source: exec-8fdaa73f-fd48-4200-a996-bff9d447bd92.png (941×1672). Sources are preserved locally under .artifacts/warm-teal/sources/.

The generator returned smaller originals despite the 4K request. The 3840×2160 and 2160×3840 exports are **upscaled, not native 4K detail**. scripts/prepare-auth-images.cjs exports the existing customer asset paths in apps/web/public/images/auth/; business assets are retained. Responsive customer desktop widths: 1280/1920/2560/3840 (219/393/560/812 KiB). Portrait widths: 480/960/2160 (37/89/244 KiB). Browsers choose according to viewport/DPR; mobile does not download the desktop image.

### Desktop prompt

Create a premium natural editorial photograph for Loqme, a Persian local surplus-food pickup marketplace. Use attached logo ONLY as exact brand mark reference on bag: preserve the distinctive deep teal sprouting Persian glyph, do not invent lettering or redesign it. Landscape 4K 3840x2160 requested. An everyday adult customer in casual cream overshirt exits a friendly neighborhood bakery/grocery shop in daylight, carrying a generous natural kraft paper takeaway bag with the supplied deep teal #1D616A logo clearly printed large on front. Fresh packaged bread peeks from bag, safe clean packaging. Customer and bag occupy leftmost 35 percent, crop person naturally from shoulders to thighs if useful, bag fully visible and focal. Warm plaster, timber and bakery shelves, everyday believable local shop, no luxury tech aesthetics, no other logos or invented storefront text. Right 60 percent softly out-of-focus warm cream plaster and muted teal shop interior with quiet negative space for HTML form; DO NOT render UI, text, buttons, labels. Soft bright natural daylight, appetizing authentic food pickup, candid movement, realistic hands and anatomy, high detail paper texture. No potted plant centerpiece, no forest, no nighttime, no dark vignette. The photograph must communicate collecting good food from a local shop.

### Portrait prompt

Create a coordinated PORTRAIT photograph matching the supplied landscape food-pickup scene, for the MOBILE login of Loqme. Target 4K 2160x3840 portrait 9:16. Same cream-clothed adult customer exiting the same warm local bakery/grocery, carrying the same kraft food bag with the EXACT supplied deep teal Loqme glyph printed large; use logo reference accurately, no invented typography or other logos. Natural daylight and realistic paper, hands, food packaging. Compose the recognizable human hand, bag, packaged bread and shop doorway in the UPPER 45 percent of portrait, bag fully visible around upper-middle, customer cropped shoulders to thighs. LOWER 55 percent becomes soft warm ivory/cream out-of-focus foreground, very quiet, so HTML form can occupy it. No UI, no text, no buttons rendered. Shop wood/plaster and soft teal details, approachable everyday local surplus food pickup, no plants as focal point, no forest, no night, no futuristic luxury. Natural editorial photo, same person and wardrobe, honest appetizing food and positive everyday moment.

## Verification

Record final checks and reviewed screenshots in PROJECT_STATUS.md and the M10 checkpoint. No backend/API changes, database migrations or deployment are included. Browser fixtures do not replace live SMS/payment/map provider acceptance.
