# White-first Loqme — CP-10.25

Owner direction, 2026-10-16. This supersedes CP-10.24 teal-glass and the rejected cream experiment. White is the dominant visible surface; logo teal #1D616A is the identity and feature color.

## Visual contract
- White navigation, listing cards, form panels, inputs, dialogs and operational work areas. Dark #203B3B text, #526460 secondary text, #CDDCD6 borders.
- Pale green #E8F1EE canvas frames shopping and portal content. Selected states use #E1EFEB. No blurred photographs behind grids or tables.
- White action buttons with teal text and visible teal borders; pale teal hover keeps labels readable. Destructive/status colors retain their meanings. Teal badges, feature areas and compact footer retain white labels.
- Customer and merchant authentication retain their pickup/bakery photographs, decode gate, retry and explicit image-free fallback, with white cards and white logo-only headers. Customer artwork provenance/upscaling remains documented in WARM_TEAL.md.
- Light browser controls regardless of device appearance. RTL, Vazirmatn, DM Sans and reduced motion remain.

## Homepage and navigation
- `/` is a static editorial introduction: pickup photo hero (no video), value/discovery/trust reasons, food-category ticker, three pickup steps, Urmia-first coverage and merchant invitation.
- `/discover` preserves the previous homepage shopping view and hero. `/explore` retains map/search behavior. Primary navigation and hero CTAs lead into shopping. The logo returns home.
- Saved root URLs containing discovery query keys redirect to `/discover` with their full query preserved. Sitemap includes both pages.
- Coverage copy describes the Urmia pilot; actual inventory/availability remains API-driven. No invented figures, city expansion promises or discount claims.
- Category ticker repeats one decorative hidden copy, supports pause/resume, pauses on hover/focus and becomes a static wrapping list under reduced motion. Food categories only; no unsupported cosmetics/pet-care claims from competitor references.

## Authentication and mobile account entry
- Customer authentication uses the responsive food-pickup artwork already prepared for Loqme. Mobile serves the portrait 480/960/2160 WebPs and keeps the branded bag prominent; desktop serves the landscape 1280/1920/2560/3840 set. The image decode gate, retry and image-free fallback remain required.
- Auth pages end with the white form card. They do not render a page-level teal footer. The concise business/customer cross-link remains inside the form card.
- Login and registration helper copy stays to one line at supported widths. The selected segment follows `aria-pressed` and `data-selected` so visual and accessible state remain synchronized.
- The mobile customer header contains only the centered logo. Customer and business login actions are absent at widths up to 767px. `حساب من` in the persistent bottom navigation is the single mobile entry: signed-out access opens the login form with `/profile` preserved as the return target, and the Account/Profile experience provides the business sign-in path at `/business/login`. Desktop and tablet header actions remain unchanged.

## Validation
The base CP-10.25 release passed 65 focused tests and 23 distinct production browser scenarios. The CP-10.26 refinement passed 35 focused tests and seven optimized-build browser scenarios, plus typecheck, zero-warning lint and production build. CP-10.27 reran both optimized-build homepage/navigation scenarios, typecheck, zero-warning lint and production build. See PROJECT_STATUS.md for scope and `.artifacts/white-teal/` for logs, desktop/mobile screenshots and route-wide axe evidence. Screenshots use test fixture inventory; no backend changes or deployment.
