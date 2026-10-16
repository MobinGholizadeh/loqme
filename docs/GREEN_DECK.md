> **Current direction (2026-10-16, CP-10.25):** [WHITE_TEAL.md](WHITE_TEAL.md) supersedes earlier palettes below. White surfaces and navigation, logo teal feature sections, pale green canvas and a separate editorial homepage leading to `/discover`.

# Green Deck — application theme history

Owner request, 2026-10-14/15: rebuild the entire application using Magic UI, smooth interactions and better buttons, adopting the supplied Green Deck document. This is an explicitly authorized M10 visual follow-up alongside the existing M12 work. Backend domain rules and APIs are unchanged by this checkpoint. Pre-existing M12 working-tree changes remain intact.

## Current design contract — CP-10.24

[TEAL_GLASS.md](TEAL_GLASS.md) defines the authoritative photographic teal/glass treatment after the owner rejected cream. The GREEN_DECK export and theme name remain as compatibility identifiers. The older white/bright-green and initial botanical rules below are historical, not current requirements.

## Previous design contract — owner correction, 2026-10-15

**Authentication exception (CP-10.23):** The owner subsequently requested the botanical photo/glass treatment documented in [BOTANICAL_AUTH.md](BOTANICAL_AUTH.md) for login, customer registration, business registration and application status. That scoped green scene and white CTA supersede the light-surface rule only on those entry screens; other routes remain white and green.

The preserved inspiration is [GREEN_DECK_REFERENCE.md](GREEN_DECK_REFERENCE.md). The owner explicitly rejected its dark-first appearance and approved a white-and-green application. This correction supersedes the source document's dark colors. Page/card/modal surfaces are #FFFFFF, raised controls #F5F7F6, primary text #172B29 and links/icons #15803D. Pale green marks selection, with subtle neutral borders separating white surfaces. Light mode is forced regardless of the device preference; there is no theme switcher.

The owner's subsequent feedback requests white button labels, logo-only customer navigation, and a compact footer without the giant LOQME wordmark. Actions therefore use #15803D with #166534 hover and #FFFFFF labels, rather than bright #1DB954 with dark labels. This maintains readable contrast. The existing hero and its three pickup-step cards are preserved. The footer has a concise introduction, navigation/help links, a merchant invitation and a small copyright/domain row. Official colored logo assets replace white-on-dark navigation artwork.

Adaptations: Persian remains RTL with local licensed Vazirmatn, zero Persian tracking and Persian digits/Toman/Jalali conventions. Local OFL-licensed DM Sans is used for Latin branding. White button labels use deeper green backgrounds for sufficient contrast. Controls retain at least 44px touch height instead of the reference's 32px. Labels/status colors use appropriate contrast on white surfaces. Audio-player controls and persistent now-playing bars are irrelevant to the marketplace and are not introduced. Code typography is not changed because there is no code-editor surface.

## Implementation

- Platform-neutral `GREEN_DECK` palette and explicit `generateCssVariables("green-deck")` root selection; classic default stays compatible with other consumers. Initial SSR includes the correct theme without localStorage or a dark-theme flash.
- Tailwind compatibility palettes, semantic CSS and legacy literal-color migration cover customer, authentication, onboarding, merchant, admin, dialogs, forms, errors/offline and About routes.
- Magic UI Ripple Button, Blur Fade and Magic Card are vendored/adapted from upstream MIT source, with provenance and license in `components/magicui`. Existing framer-motion is reused; no second motion runtime or theme-provider dependency. Native button handlers, refs, form types and disabled states are retained. The shared Button exposes loading through aria-busy.
- Ripple effects are keyboard-centered, bounded to four concurrent nodes, cleaned on animation end with a timeout fallback, and suppressed for reduced motion. Card highlights are pointer-inert and mouse-only. Entrance motion is brief, content stays visible on the server, and temporary transforms/filters are removed after entry so fixed controls remain viewport-relative.
- Discovery receives a new responsive hero, clear real-world pickup steps and working discovery/map links. Listings, forms, tables, navigation, auth panels and footer use consistent light surfaces. No fixture inventory, counts, social proof or fabricated urgency is shipped.
- Local fonts and PWA chrome/background colors match the theme. No production deployment, migration, commit or push is included.

## Earlier rebuild validation (before the light correction)

- 43 focused tests passed across UI controls, dialogs/images, design contracts, PWA/SEO and the new ripple/theme checks. A subsequent focused control/ripple rerun passed 14/14.
- 20 browser scenarios passed across the redesign, new Green Deck and merchant-data suites. Includes checkout/pickup, OTP, merchant publishing/staff, admin operations, report/recovery flows, 390/1440px full route matrices, all-route axe scans and public/onboarding checks at 375/768/1440px. Merchant report checks additionally cover 360px.
- Mobile image-integrity checks now scroll lazy images into view before asserting successful loading; no image assertions were removed.
- Workspace typecheck, zero-warning lint and final production build passed. Final typography/input/button follow-up passed 14 focused control tests and both public/all-route accessibility browser scenarios.
- Browser fixtures test UI behavior, not real payment/SMS/map providers. Existing CP-11.9 coverage and live provider/device gates remain open. No claim of full backend-suite revalidation or deployment is made.

Screenshots are generated under ignored `test-results/`; representative delivery captures are copied to `.artifacts/green-deck/`. Use `npm run dev` to preview the application. Future changes should use the shared theme/controls rather than reintroducing hardcoded dark surfaces.


## Light correction validation

Current run passed 43 focused tests, 24 browser scenarios, workspace typecheck, lint and production build. Reviewed screenshots are in `.artifacts/white-green/`. Detailed results and provider limitations are recorded in PROJECT_STATUS.md. The browser test explicitly emulates a dark device preference while asserting white canvas/light color-scheme, checks white action labels and verifies the absence of navbar text and oversized footer wordmark. Footer regression tests now check useful links and compact layout instead of the removed reveal animation. Charts, scanner chrome and audit details are also light. No backend/API changes or deployment.
