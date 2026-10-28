# Living Project Status Tracker — Loqme (لقمه)

> **CRITICAL PROTOCOL**: This is a living operational document.  
> Future agents must inspect this file before undertaking any milestone work, and update it immediately upon completing checkpoints.  
> Do not rely on conversational memory. Never mark incomplete work as complete.

---

## 1. Project Health & Current State

### Isolated Void Frame host deployment (2026-10-28)

Added a manually dispatched deployment workflow for the independent Void Frame storefront. It builds the dedicated `voidframe-source` branch, publishes a digest-pinned GHCR image, and installs it at `/opt/voidframe` on loopback port 3100 with a separate container, data volume, Nginx virtual host, credentials, and concurrency group. The workflow does not access Loqme application data or restart Loqme services. Production run 40763178487 deployed source `222e50f` successfully; external host-header checks returned 200 for the storefront, health route, and favicon, while Loqme readiness remained 200. TLS is pending because `voidframe.space` and `www.voidframe.space` have no public A records. Operational boundaries and recovery ownership are documented in `docs/VOIDFRAME_HOSTING.md`.

### Order Merchant Confirmation RLS Fix & Full Platform Notification Expansion (2026-10-28)

1. **Order Confirmation RLS Trigger Fix**:
   - Fixed `loqme_rls.guard_write()` in PostgreSQL where array subtraction omitted `'notesFa'` on `newj`, causing false evaluation of row equivalence and throwing `42501: RLS: order payment state is server controlled` during merchant confirmation (`POST /api/merchant/orders/[id]/confirm`).
   - Applied migration `20261028130000_fix_order_rls_guard_write` cleanly across database environments.
2. **Comprehensive Notification Coverage Across Admin, Merchant & Customer**:
   - **Admin**: Auto-dispatched alerts on new merchant application submissions and new bank account Shaba registrations.
   - **Merchant**: Proactive notifications on customer complaints, customer reviews, payout status updates (approved, rejected, completed), listing safety pause overrides, and order refunds/cancellations.
   - **Customer**: In-App + Push + SMS pickup reminder notifications when 45 minutes remain, no-show expiration notices, refund settled confirmations, complaint resolution updates, and merchant review replies.
   - Added unit and contract tests in `tests/notifications-comprehensive.test.ts` (6 tests passing) and `tests/admin-notifications-events.test.ts` (2 tests passing). All 32 order and notification acceptance tests pass.

### Android emulator UI-dump verification repair — CP-10.21 follow-up (2026-10-26)

The supplied CI traceback fails while reading a missing `/sdcard/loqme-window.xml` before installation acceptance. Replaced the immediate dump/read with fresh temporary-path capture, removal of stale dumps, five bounded retries, XML/node validation, explicit ADB timeouts and saved failure output. Persistent failures still fail verification; signing, installation/upgrade, launch and publication gates remain required. Added five mocked failure/recovery tests to the production validation job.

Local validation: five UI-capture tests, four portable Android release-policy tests, three release-safety tests, four RLS environment tests and Python compilation pass; four Linux-only publication tests skip on Windows. Release follow-up: fix `eaede88` pushed to master; superseded run #84 was canceled to release the queue after its web deployment had succeeded. [Production run #85 / 40313215895](https://github.com/MobinGholizadeh/loqme/actions/runs/40313215895) passed all four jobs: 1,105 tests across 93 files, all Linux publication checks, image build, web deployment and hosted-emulator Android acceptance/publication. Signed Android **1.1.131** identifies source `eaede8849bbfb4264d6d986ca9046eaa714e0073`; independently downloaded public APK is 2,665,392 bytes and matches SHA-256 `42367ceb82cf9d2a4524dde2afc18d3d6fef7753b455761aa13d7d1be86b524a`. Live readiness/database checks pass. Anonymous live checks report ready/database connected and Android 1.1.130 from `6f16eb9`. The supplied workflow screenshot shows web deploy succeeded before Android failed; the repaired web source is now verified by the successful exact-source deployment/publication workflow. No database changes or validation bypass.

### Pickup-stage card clearance follow-up (2026-10-26)

Increased stage bottom padding to 64px on desktop, 56px on compact desktop and 52px on mobile so rotated lower card corners are no longer clipped. Compact card height adapts between 260–300px to retain CTA visibility on short desktop viewports. Both pickup and desktop-scaling browser scenarios pass, including geometric lower-edge checks across eight desktop sizes; 1280×620 screenshot reviewed and diff whitespace check passes. No deployment.

### Desktop zoom and display-scaling scroll repair — CP-10.29 / CP-10.30 follow-up (2026-10-26)

The 740px height-only media query incorrectly disabled both homepage scroll effects on wide desktops at common browser zoom/OS scaling. Wide viewports now use compact cards, spacing and nature-section typography from 601–820 CSS pixels tall, retaining sticky scrolling. Narrow viewports keep the existing 740px short-screen fallback; reduced motion and all viewports at most 600px tall retain fully readable static content for accessibility. No device/UA sniffing or zoom suppression.

Validation: pickup-stack, nature-reveal and desktop live-resize browser scenarios pass, including scaled desktop sizes, phone/landscape, reduced motion, animation progression/reversal, full CTA visibility and overflow checks. Six existing animation unit tests, zero-warning lint, workspace typecheck (after regenerating the stale local Prisma client), production build and diff whitespace checks pass. Compact 1280×620 screenshot reviewed. Notification GET/SSE fixtures now match the current header requests. The broader homepage suite's existing ticker-pause test remains stale: it expects a pause button absent from the current implementation; the mobile Account scenario passes. No database migration or deployment. Next: update the independent ticker test/behavior contract before claiming the entire homepage suite passes.

### Real-Time Support Chat System (Customer, Merchant & Admin) — CP-10.32 (2026-10-24)

Implemented a complete, production-ready, real-time support chat system connecting admins with regular customers and merchant partners:
1. **Real-Time Architecture & Resilient Delivery**:
   - High-throughput Server-Sent Events (SSE) streaming at `/api/support/conversations/[id]/events` and global admin stream at `/api/support/events` powered by `SupportEventHub`.
   - Adaptive fallback polling (4s active, 15s background) for seamless recovery during network disruptions or proxy timeouts.
   - Client-generated idempotency keys (`clientMessageId`) guaranteeing zero duplicate messages on reconnections or double taps.
   - Live read receipts (`isRead`, `readAt`, `readByUserId`), double checkmarks, and unread counter badges.
2. **Text, Image & Document Sharing**:
   - Secure multipart file upload endpoint at `/api/support/upload` supporting images (JPG, PNG, WebP) and documents (PDF, TXT) capped at 10MB.
   - Strict filename sanitization and local isolated storage in `.data/support-attachments/`.
   - Authenticated file-streaming endpoint at `/api/support/attachments/[id]` enforcing strict conversation ownership and admin-only bypass.
3. **Database Schema & PostgreSQL Row Level Security (RLS)**:
   - Models `SupportConversation`, `SupportMessage`, and `SupportAttachment` with status enums (`OPEN`, `RESOLVED`, `CLOSED`), priorities (`LOW`, `NORMAL`, `HIGH`, `URGENT`), and channel types (`CUSTOMER_ADMIN`, `MERCHANT_ADMIN`).
   - Migrations `20261024165256_support_chat_system` and `20261024170330_support_attachment_nullable_message` deployed with comprehensive RLS policies and grants for `loqme_app` and `loqme_rls_reader`, preventing cross-customer or cross-merchant data leakage.
4. **Responsive UI/UX & Navigation**:
   - Centralized Admin support dashboard at `/admin/support` with split master-detail view, channel/status filters, instant search, and status modification dropdown.
   - Dedicated Merchant store support page at `/merchant/support` with automated channel creation and order issue tracking.
   - Customer support page at `/support` with mobile-first layout and guest-login prompting.
   - Live badge counters integrated into `PortalShell` navigation for merchants and admins, plus customer profile quick actions.
5. **Quality & Validation**:
   - 19 automated unit and API route contract tests in Vitest passed in under 1s.
   - Zero TypeScript errors across all workspaces in `npm run typecheck`.
   - Optimized Next.js production build (`npm run build`) successfully compiled all static and dynamic support routes.

### Merchant Bank Accounts Management & Wallet Withdrawals — CP-10.31 (2026-10-23)

Implemented complete, secure, end-to-end bank account management and wallet payouts for merchants across the Merchant Panel and Admin Panel:
1. **Bank Catalog & Validation (`packages/validation`)**:
   - Comprehensive catalog of 34 Iranian banks (`IRANIAN_BANKS`) with official bank codes, names, and card prefixes.
   - Full ISO 7064 Mod 97-10 checksum validation with BigInt arithmetic (`isValidShaba`).
   - Normalization utility for Persian digits, whitespace, and IR prefix (`normalizeShaba`).
   - Real-time bank auto-detection from Sheba number (`getBankFromShaba`).
   - Zod validation schemas for bank account creation/updates, admin reviews, and payout requests.
2. **Database Schema & Migrations (`prisma`)**:
   - Added models `MerchantBankAccount` and `MerchantPayoutRequest` with status enums `BankAccountStatus` (`PENDING`, `APPROVED`, `REJECTED`) and `PayoutRequestStatus` (`PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`).
   - Migration `20261023081030_merchant_bank_accounts_payouts` applied with full PostgreSQL Row Level Security (RLS) policies, verifying 36 enforced tables and strict tenant/role separation.
3. **Domain Services & Security Guardrails**:
   - `MerchantBankService`: multi-account management, soft-deletion guards (prevents deletion when active payouts exist), edit re-approval triggers (resets to `PENDING` on Shaba/name change), default account selection restricted to approved accounts, live available balance hold (`netEarnings - completed - pending/approved`), and 30-second rapid duplicate submission guards.
   - `AdminBankService`: administrative approval/rejection for bank accounts, and payout lifecycle management (`APPROVED`, `REJECTED`, `COMPLETED` with Paya tracking reference and double-entry financial transaction ledger recording).
4. **Merchant & Admin UI**:
   - Modern White & Teal responsive UI with tabbed finance navigation ("صورت‌حساب و دفاتر کل", "حساب‌های بانکی همکار", "درخواست‌های تسویه و برداشت") and dedicated `/merchant/accounts` route.
   - Bank detection card preview in Iranian Sheba modal with quick copy and status badges.
   - Available balance KPI cards, quick payout percentage pills, destination account picker (pre-selecting default approved account), and status history table.
   - Admin panel approval modals and Paya tracking code entry in `/admin/finance`.
5. **Quality & Test Validation**:
   - 106 tests across 7 test files passed cleanly (including 15 bank validation tests, 19 domain service tests, 13 API route contract tests, finance page tests, and boundaries).
   - Zero-error workspace typecheck across all 5 monorepo packages.
   - Clean Next.js production build (`next build --webpack`) compiling all 38 static and dynamic routes.

### Food value and nature reveal — CP-10.30 (2026-10-23)

Text follow-up: applied the owner-supplied ResponseStream word-fade effect to the nature section's Persian heading, introduction and benefits. Starts once in view, preserves joined Persian words and layout, exposes complete text to screen readers and respects reduced motion. Four browser scenarios and lint pass; the independent PortalShell blocker below remains.

Added the requested expanding-image scroll component directly below the pickup stack. New generated garden/food photography, desktop and mobile exports, and Persian copy explain customer savings, neighborhood-shop sales opportunities and reduced food waste. Scroll progress is local to this section; readable content, responsive cropping, static reduced-motion and short-height fallbacks are included. Four browser scenarios (including axe/navigation, card-stack regression and new reveal/mobile coverage), lint and screenshot review pass. Existing PortalShell `badge` errors at lines 143/145 still block workspace typecheck/release validation. No backend changes or deployment. Artwork paths and built-in generation prompt are in WHITE_TEAL.md.

### Scroll-stack pickup guide — CP-10.29 (2026-10-23)

Background follow-up: the owner requested unique imagery after the initial bakery reuse. The approved stack now uses two newly generated food-counter still lifes with food framing the edges and a quiet teal center. Four responsive landscape/portrait WebPs are saved in apps/web/public/images/home; subtle blur, teal overlay and white heading/helper copy remain. Built-in generation prompts and provenance are in WHITE_TEAL.md. Three browser scenarios (including axe and scroll/reversal), lint and desktop/mobile screenshot review pass. No new dependencies or deployment; the independent build blocker below remains.

Owner-supplied animated card stack adapted to three Persian steps: discover a package, reserve/pay online, and collect in person using the order code/QR. Replaces the three sections after the food ticker; hero, introduction, ticker and shopping behavior are preserved. Cards lift and rotate away with reversible scroll progress; reduced-motion and short-height layouts show every card statically. Uses existing Motion dependency and Loqme styling, with no testimonial content or new packages. The earlier grocery-bag experiment was reverted and is not part of this implementation.

Validation: three browser scenarios (desktop/mobile, axe/navigation, transitions/reversal, reduced motion and landscape), six existing animation tests and lint pass; screenshots reviewed. Production compilation succeeds; full build and typecheck remain blocked by existing `PortalShell.tsx` navigation `badge` errors at lines 143/145. Resolve that independent issue before release validation. No deployment. See [WHITE_TEAL.md](WHITE_TEAL.md).

### Homepage motion, hero type and Persian punctuation — CP-10.28 (2026-10-22)

The homepage animation regression is repaired: React Bits `SplitText` now renders each hero line as a `<span>` that inherits the `h1` typography, preventing the generic hero paragraph rule from shrinking «یک کشف خوشمزه» and «یک خرید هوشمندانه». Browser coverage verifies both lines inherit the computed heading size and that Lenis initializes on the document. User-facing Persian copy across the web application no longer ends sentences with ASCII full stops; internal sentence boundaries use Persian semicolons and loading copy uses the single ellipsis glyph. A source-level regression test enforces this copy rule without changing URLs, version numbers or decimal values.

Local validation passed: **1,011/1,011 tests across 83 files** against a freshly migrated, seeded disposable PostgreSQL database with the restricted RLS runtime; workspace typecheck, zero-warning lint, optimized production build and both responsive homepage browser scenarios also passed. The browser run produced reviewed 390px and 1440px captures.

Release follow-up: production run 39779819127 deployed source `a20d203` and passed Linux validation, image build and server deployment. Live verification found the corrected 69.12px hero lines, active Lenis easing, zero visible Persian terminal full stops and a healthy database readiness response. The Android publication gate then failed before device startup because the hosted runner had less free space than emulator 37.2 required. Its `disk-size` setting was written correctly but ignored by that emulator build, so the workflow now removes unused hosted .NET, Haskell and Boost toolchains and requires at least 9 GB free before launching the disposable API-35 device. The release-policy test enforces both the bounded AVD configuration and disk preflight. Final [run 39788633974](https://github.com/MobinGholizadeh/loqme/actions/runs/39788633974) passed all four jobs after one transient Google system-image download retry: 1,011 tests and RLS checks, image build, production deployment, signed emulator acceptance and atomic Android publication. Live readiness is connected at 14 ms and Android **1.1.126 (126)** identifies source `41618ac`.

### Database row-level security — CP-12.6 (2026-10-22)

Activation follow-up: owner authorized both local setup and live production activation; **both are complete**. Local backup restore/migration rehearsal and actual migration preserved model row counts; 34 tables enforce RLS, `loqme_runtime` is provisioned, environment files updated and development server restarted. Production source `13b32b0` deployed in [run 39744132807](https://github.com/MobinGholizadeh/loqme/actions/runs/39744132807) at 08:05 UTC on 2026-10-22. Server backup checksum/restore rehearsal, migration, restricted-login verification (`34` enforced tables; anonymous private access denied) and readiness passed. External public routes returned 200; protected customer/merchant/admin APIs returned 401 without sessions. First-run password setup and runtime verification are automated. The dependency lockfile and Docker workspace dependency copying were repaired. Final Linux CI passed 1,010 tests and 15 deployment/Android policy tests; image build and web deployment succeeded. See DATABASE_RLS.md for image digest and backup/evidence paths. Existing live-provider/device/performance gates remain independent.

Owner explicitly requested role-specific RLS after the repository audit found application RBAC but no PostgreSQL RLS. Implemented ENABLE/FORCE policies for all 34 model tables, a restricted runtime login, verified request identity with transaction-local scope, live owner/staff/admin checks, narrow service capabilities, protected financial/history writes and a public-review projection. Migration/provisioning credentials are separated from production web credentials. Deployment pauses writers before backup and refuses automatic rollback to a pre-RLS image. See [DATABASE_RLS.md](DATABASE_RLS.md) for the exact role matrix, trust boundary, setup and recovery procedure.

Initial implementation validation: fresh disposable PostgreSQL 15/PostGIS accepted all 16 migrations and seed; **1,010/1,010 tests across 82 files passed**, including 20 real restricted-role RLS tests. Workspace typecheck, zero-warning lint, Prisma validation, production build, Compose configuration checks and 11 deployment/Android policy tests passed. That initial validation did not migrate ordinary developer or production databases; the subsequent authorized activation above did. Existing coverage/provider/device and production performance gates remain open.

### Lenis smooth scrolling, GSAP animation orchestration, and React Bits integration (2026-10-16)

Installed `lenis`, `gsap`, `@gsap/react`, and introduced the `react-bits` package/vendored library for Loqme:
1. **Lenis (`lenis` + `lenis/react`)**: Added [SmoothScrollProvider](file:///d:/AiProjects/loqme/apps/web/src/components/lenis/SmoothScrollProvider.tsx) integrated into root [layout.tsx](file:///d:/AiProjects/loqme/apps/web/src/app/layout.tsx), synchronizing Lenis's smooth momentum scroll raf loop with GSAP's ticker, with full SSR safety and `prefers-reduced-motion` accessibility support.
2. **GSAP (`gsap` + `@gsap/react`)**: Integrated GSAP 3 and official `@gsap/react` `useGSAP` hook, registering `ScrollTrigger` in harmony with Lenis and powering smooth text reveals.
3. **React Bits (`react-bits`)**: Vendored and configured React Bits components ([SplitText](file:///d:/AiProjects/loqme/packages/react-bits/src/SplitText.tsx), [SpotlightCard](file:///d:/AiProjects/loqme/packages/react-bits/src/SpotlightCard.tsx), [ShinyText](file:///d:/AiProjects/loqme/packages/react-bits/src/ShinyText.tsx), [Magnet](file:///d:/AiProjects/loqme/packages/react-bits/src/Magnet.tsx), [CountUp](file:///d:/AiProjects/loqme/packages/react-bits/src/CountUp.tsx)) in both a dedicated monorepo workspace package (`packages/react-bits`) and `apps/web/src/components/reactbits`. Active on the homepage ([HomeLanding.tsx](file:///d:/AiProjects/loqme/apps/web/src/components/home/HomeLanding.tsx)): SplitText hero title entrance, ShinyText location eyebrow, Magnet magnetic CTA buttons, and interactive SpotlightCards for value props.
4. **Validation**: Zero-warning ESLint, clean workspace typecheck (`tsc --noEmit`), 6/6 dedicated unit tests passing in [lenis-gsap-reactbits.test.tsx](file:///d:/AiProjects/loqme/tests/lenis-gsap-reactbits.test.tsx), and full Next.js production build (`next build --webpack`) generating 37/37 static pages cleanly.

### Full release validation for Git publication (2026-10-16)

The complete pending M12 and CP-10.22–CP-10.27 working tree was validated before the owner-requested Git publication. A fresh disposable PostgreSQL database named with the guarded `loqme_onboarding_test_release_20261016_*` prefix accepted all 15 checked-in migrations and fresh seed data. The complete serial Vitest suite passed **984/984 tests across 80 files**. Workspace typecheck, zero-warning ESLint, Prisma schema validation, the standard `.next` production build, focused optimized-build mobile/desktop navigation checks and diff whitespace checks passed. The ordinary developer database and production were not migrated or seeded; ignored build/test artifacts are excluded from source control.

### Mobile Account-only login entry — CP-10.27 (2026-10-16)

Owner-authorized mobile-only refinement completed locally. At widths up to 767px, the customer header now contains only the centered logo: customer login and business login buttons are both hidden. `حساب من` remains in the persistent mobile navigation; signed-out access opens `/login?redirect=%2Fprofile`, while the Account/Profile experience continues to expose the business sign-in path. Desktop and tablet header actions are unchanged.

Final validation passed: both optimized-build homepage/navigation browser scenarios, workspace typecheck, zero-warning lint, production build and visual inspection of the signed-out 390px capture. Evidence is in `.artifacts/white-teal/mobile-account-*` and `.artifacts/white-teal/screenshots/home-mobile-signed-out.png`. No backend/API changes or deployment.

### Authentication and mobile-entry refinement — CP-10.26 (2026-10-16)

Owner-authorized follow-up completed locally. Authentication pages no longer render the redundant page-level teal footer; the useful customer/business cross-link remains inside the white form card. Customer registration uses a one-line helper and a stable, explicit segmented-control state, so switching from login does not stretch the form or leave the wrong tab painted. The editorial homepage now serves the dedicated 480/960/2160 portrait pickup photograph on mobile and the desktop set at larger widths. Mobile customer navigation removes the separate business button and exposes business sign-in from Account/Profile, linking to `/business/login`.

Final validation passed: 35 focused component/contract tests, seven optimized-build browser scenarios, workspace typecheck, zero-warning lint and production build. Browser coverage includes responsive source selection, auth image decode/failure/retry/reduced-motion behavior, compact registration height and selected mode styling, homepage shopping navigation and the mobile Account business-entry flow. Final mobile captures are in `.artifacts/white-teal/screenshots/`. Existing fixtures and business behavior are preserved; no backend/API changes, new generated artwork or deployment.

### White-first surfaces and introductory homepage — CP-10.25 (2026-10-16)

Owner-authorized follow-up completed locally. White navigation, cards and forms replace the overly green treatment; logo teal remains in feature sections. A new editorial homepage leads into the preserved shopping view at `/discover`, with a static pickup-photo hero, food ticker with pause/reduced motion, reasons to use Loqme and truthful Urmia-first coverage. [WHITE_TEAL.md](WHITE_TEAL.md) is authoritative. Validation: 65/65 focused component/contract tests and 23/23 distinct production browser scenarios passed across the run and targeted reruns. Coverage includes the new homepage-to-shopping flow, ticker pause/reduced motion, saved filter links, white-surface/hover checks at 375/768/1440px, authentication image gates, all five business registration steps at 390/1440px, checkout/pickup, merchant/admin actions, route-wide axe and 390/1440px screenshot matrices. The mobile filter overflow was fixed. A registration run interrupted by the preview-server restart passed on rerun; homepage tests wait for accessible streamed content. Workspace typecheck, zero-warning lint, optimized build and whitespace checks passed. Existing Next middleware/Edge warnings remain. Preview screenshots use fixture data and are in `.artifacts/white-teal/screenshots/`; route captures/logs are alongside them. No backend/API changes, migrations or deployment. Live-provider/device acceptance gates remain unchanged.

### Teal photography and glass — CP-10.24 (2026-10-15)

The owner rejected the interim cream/ivory treatment and requested the previous green-glass authentication style with the new customer food-pickup photographs, plus matching color/background treatment throughout the application. [TEAL_GLASS.md](TEAL_GLASS.md) is now authoritative: logo-matched #1D616A actions, photographic blurred shell backgrounds, translucent teal panels, strong table/dialog surfaces, readable light text and logo-only navigation. Customer login/registration retain the new person-with-Loqme-bag imagery; merchant imagery is retained. Auth load/decode/retry/fallback behavior remains, while ordinary pages stay usable if decorative photography fails. The cream experiment is historical in WARM_TEAL.md; older white-only/botanical visual directives below are superseded.

Validation: 65 focused component/contract tests and 24 production browser scenarios passed, including image loading/failure/cache handling, all five business registration steps, OTP, checkout/pickup, merchant/admin flows, all-route axe checks and 390/1440px route matrices. Workspace typecheck, zero-warning lint and production build passed. Existing Next.js middleware/Edge warnings remain. Desktop/mobile captures are in `.artifacts/teal-glass/screenshots/`; browser route captures and logs are retained alongside them. Source artwork is smaller than 4K; exports are explicitly documented upscales, with responsive mobile delivery. No backend/API changes, migrations or deployment; live-provider acceptance gates remain open.

Final CP-10.24 visual follow-up: status figures on merchant/admin dashboards now use the readable semantic warning/danger colors. The final production build, lint, all-route axe check and desktop route matrix passed after that correction. Screenshots were refreshed; no remaining implementation work is deferred for this visual request.

### Botanical authentication — CP-10.23 (2026-10-15)

Registration follow-up: the owner requested the same merchant treatment after clicking `ثبت کسب‌وکار`. `/business` now uses the bakery scene and image-ready gate across all five steps, with a wider desktop glass panel and responsive category, map, hours and owner/OTP controls. `/business/status` shares the treatment. The top-right header now shows only the logo symbol on all authentication/registration screens. City labels, focus links, errors and controls have scoped contrast styles; the map-loader status semantics are corrected. All 23 browser scenarios passed across the production run and reruns: 21 initially, with admin/logout rerun successfully using an isolated non-default test session secret required by production. Workspace typecheck, zero-warning lint and production build passed. Screenshots are in `.artifacts/business-registration/`. No business/API changes or deployment.

Final registration verification: four additional production browser checks passed after the skip-link contrast correction, covering focused keyboard links and all five steps at 390/1440px. Final build and whitespace checks passed; captures were refreshed and inspected. Existing Next.js middleware/Edge warnings remain; no live SMS or map provider was exercised.

Business follow-up: `/business/login` now has distinct bakery/storefront artwork for mobile and desktop, merchant benefits, matching loader copy and an explicit store-registration action. The customer navbar and customer-login business entry now lead to sign-in rather than directly to onboarding. Existing registration remains accessible at `/business`. Seven production browser scenarios passed across customer regression, business layouts/axe at 375/768/1440px, entry-to-registration navigation, artwork failure recovery and business OTP audience/merchant redirect. Workspace typecheck, zero-warning lint, production build and whitespace checks passed. Reviewed captures are in `.artifacts/business-auth/`. Built-in-generated artwork includes optimized responsive variants and upscaled 4K exports; prompts and asset paths are in [BOTANICAL_AUTH.md](BOTANICAL_AUTH.md).

Owner-supplied plant references initially guided `/login`, `/register` and `/business/login`: separate mobile/desktop plant artwork, Persian RTL glass forms and environmental reinforcement. Store onboarding subsequently joined this scoped treatment as described above; other application surfaces stay light. The form is hidden and inert until the selected image loads and decodes, with a leaf loader, cached-load handling, retry and explicit image-free recovery after failure or a 12-second wait. Phone/OTP, registration, errors, resend, guest access and redirects are preserved. See [BOTANICAL_AUTH.md](BOTANICAL_AUTH.md) for the artwork prompts and loading contract. 4K-sized exports are upscaled from the generator's smaller originals; mobile WebP variants are 30–77 KiB.

Validation: 36 focused component tests, workspace typecheck and zero-warning lint passed. Production build passed (existing Next.js framework warnings remain). Seven production browser scenarios passed: 375/768/1440px and landscape layouts, axe contrast including error/filled OTP states, responsive artwork selection, cached/held/failed loads, retry/fallback, reduced motion, login help/focus restoration, existing OTP redirects and public/onboarding regression checks. Reviewed desktop, mobile, OTP and loader captures are in `.artifacts/botanical-auth/`. No backend/API changes or deployment; live provider gates remain open.

### White-and-green correction — CP-10.22 follow-up (2026-10-15)

Owner rejected dark mode and approved a light-only application, retaining the Magic UI interactions and hero. Further feedback restored white button labels (accessible #15803D fill), removed navbar text beneath the logo, and replaced the oversized LOQME footer with compact navigation, brand introduction and merchant invitation. Customer/auth/onboarding/merchant/admin surfaces, chart states, scanner chrome, audit details and PWA chrome now use the light theme. [GREEN_DECK.md](GREEN_DECK.md) is the current contract; the supplied reference remains unchanged as historical inspiration. Validation: 43 focused tests and 24 browser scenarios passed, including OTP/login, discovery, checkout/pickup, merchant/admin flows, responsive route matrices, footer/navigation regressions, reduced motion and all-route axe checks. Workspace typecheck, lint, production build and diff whitespace checks passed. Build retains Next.js Edge Runtime warnings; browser fixtures do not validate live payment/SMS/map providers. Reviewed desktop/mobile captures are in `.artifacts/white-green/`. No deployment or backend/API changes.

Button hover follow-up: the outlined customer-header business entry now keeps its outline, dark-green label and a pale-green hover surface instead of inheriting the solid primary fill. The focused Playwright theme scenario and zero-warning lint both pass.


### Earlier local rebuild (dark styling superseded): Green Deck + Magic UI — CP-10.22 (2026-10-14/15)

Owner explicitly requested the entire application be rebuilt with Magic UI and supplied Green Deck as the new design system. Shared dark tokens, customer/auth/onboarding/merchant/admin styling, ripple buttons, card highlights, brief page entrances, responsive discovery hero, local DM Sans/Vazirmatn and dark PWA chrome are implemented. See [GREEN_DECK.md](GREEN_DECK.md). This overrides historical white/teal appearance; product/domain rules are preserved.

Validation: 43 focused tests and 20 browser scenarios passed, including 390/1440px route matrices, all-route accessibility, 375/768/1440px public/onboarding checks, merchant reporting at 360–1440px, checkout/OTP/pickup and admin operations. Workspace types, lint and final production build passed. Final typography/input/button follow-up: 14/14 focused control tests and 2/2 public/all-route accessibility browser scenarios passed. No deployment, migration, commit or push. Pre-existing M12 work and open production/coverage gates are preserved.


### Active: M12 merchant data foundation — LQ-MDAI-001 (2026-10-13)

The owner approved and saved [LQ-MDAI-001](plans/LQ-MDAI-001.md). Its first marketplace foundation release is implemented locally: live scoped authority, atomic reservations, durable payment attempts and evidence-based reconciliation, immutable purchase snapshots, transactional listing/inventory histories, owner reports and deterministic Persian insights. See [M12 checkpoints and validation](milestones/M12-merchant-data.md) and [implementation contract](MERCHANT_DATA.md).

Validation: **981/981 tests**, **13/13 browser scenarios**, workspace typecheck, lint and production build passed. All five new migrations were tested only on disposable PostgreSQL databases; history reconciliation found zero counter mismatches. The coverage run passed its 980 tests but failed the unchanged 100% gate (60.58% lines); **CP-11.9 and production launch gates remain open**. Generic operation receipts, broader legacy analytics/multi-store workflows and external POS/OCR/provider/voice/assistant phases remain in the plan backlog. No deployment, production migration, commit or push was performed.

### Delivered: Extended OTP Expiration to 15 Minutes (2026-10-09)

User reported OTP codes expiring prematurely due to Iranian SMS gateway delays.
- **Extended Validity**: Increased `OTP_EXPIRY_SECONDS` from 120s (2m) to 900s (15m) in `apps/web/src/domain/auth/auth.service.ts` with `.env` override support (`OTP_EXPIRY_SECONDS`).
- **Decoupled Resend Throttling**: Kept resend button cooldown at 120s (`cooldownSeconds: 120`) in `auth.service.ts` and `OtpLoginForm.tsx` so users can request a resend after 2 minutes if SMS was lost, while existing issued codes remain valid for 15 minutes.
- **Friendly UX Hint**: Added Persian indicator in `OtpLoginForm.tsx` clarifying `(اعتبار: ۱۵ دقیقه)`.
- **Test Suite Updates**: Updated `tests/auth-account-check.test.ts` and `tests/auth.test.ts` to assert 900s expiration. All 32 focused auth tests, workspace typecheck, and lint pass.

### Delivered: CP-10.21 Android branding, launch and updates (2026-10-08)

Official icons, canonical shop configuration, native daily update prompt, public versioned downloads and deployment-linked releases are implemented and pushed. Production run 37665504690 deployed source 1f2095a and published signed **1.1.123 (123)**; anonymous Loqme download and GitHub asset are byte-identical. Compiled artwork/domain/signer checks, signed upgrade from 122, clean emulator install, deep links and offline entry pass. 958 web tests, eight Linux publication-policy tests, four native policy tests, production build, lint, workspace types and three optimized-build guest/About browser scenarios pass. Bundled official Vazirmatn fixes the Google font-loader build failure. Follow-up runs verify the live Persian update dialog, Later and daily suppression, plus full-screen signed TWA launch. API-35/Chrome-124 run 37726572658 confirms rendered full-screen discovery from the public signed APK. Physical-device/login/payment acceptance and existing M11 gates remain open. See [ANDROID_RELEASES.md](ANDROID_RELEASES.md).

### Fixed: Production OTP login rejection behind reverse proxy (2026-10-07)

User reported login failure on production (`https://loqme.shop/login`), displaying `درخواست نامعتبر است.` on OTP code request.
- **Root Cause**: In `apps/web/src/lib/auth/request-guard.ts`, `guardOtpRequest` performed a naive `origin !== request.nextUrl.origin` equality check. In production, Nginx terminates SSL for `https://loqme.shop` and proxies internally to Next.js standalone on `http://127.0.0.1:3000`. Next.js constructed `request.nextUrl.origin` as `http://localhost:3000`, while modern browsers always send `Origin: https://loqme.shop`. Because `https://loqme.shop !== http://localhost:3000`, all web browser login attempts were blocked with HTTP 403 (`درخواست نامعتبر است.`).
- **Fix**: Replaced the strict equality check in `request-guard.ts` with `isValidOrigin(request)` which inspects `x-forwarded-host`, `x-forwarded-proto`, `host`, configured `NEXT_PUBLIC_APP_URL`, and official Loqme domains (`loqme.shop`, `loqme.ir`), while maintaining strict rejection of `sec-fetch-site: cross-site` and untrusted origins. Aligned official domain fallbacks in `apps/web/src/lib/business/http.ts`.
- **Verification**: Tested live reproduction using curl (HTTP 403 reproduced with `Origin: https://loqme.shop`, HTTP 200 without Origin). Added automated tests in `tests/auth-security-repairs.test.ts` validating reverse-proxied production requests, native mobile requests, and untrusted cross-origin requests. Lint and workspace typecheck pass with zero errors.

### Implemented: CP-10.20 Guest browsing and About Loqme (2026-10-07)

Customer login/register now offer «ادامه بدون حساب کاربری» on phone and OTP steps; business and embedded forms omit it. Added public `/about`, footer navigation, canonical/sitemap metadata and centralized editable Persian copy with hidden empty business/contact fields. Desktop, mobile web/PWA and existing Android TWA share the change; no native client, listing-type expansion, migration or deployment. Shared shell navigation landmarks were corrected. Existing uncommitted edits are preserved.

Validation: **39/39 focused unit tests**, **8/8 optimized-build browser tests**, production build, lint and all workspace typechecks pass. Browser coverage includes guest navigation with no session, reservation 401, protected order redirect, persisted-login return flow, public About HTML, empty contact omission, sitemap and keyboard/axe checks at 360/390/768/1440px. Mobile/desktop screenshots inspected. Local database unavailable; no physical Android smoke or SMS.ir approval. The root loading boundary still requires JavaScript to reveal About content, although its content is server-rendered. Existing M11/provider/device gates remain open. See [GUEST_ABOUT.md](GUEST_ABOUT.md).

### Delivered: Tagline Refinement & Nature-Friendly Food-Rescue Messaging (2026-10-04)

User requested replacing the legacy «خوب بخور، کمتر خرج کن» slogan with an inspiring, nature-friendly, food-rescue tone across the website.
- **Brand Taglines**: Introduced «طعم‌های تازه، مهربانی با زمین، انتخابی هوشمندانه» as primary tagline and «تازه، به‌صرفه، دوستدار زمین» as the compact triplet across `AuthLayout.tsx`, `MarketFooter.tsx`, `README.md`, and `docs/BRAND.md`.
- **Site-Wide Food Rescue & Nature Messaging**:
  - `page.tsx` (Homepage): Enhanced intro paragraph emphasizing food rescue, neighborhood support, and caring for nature while preserving the H1 heading for verified SEO tests.
  - `AuthLayout.tsx` & `OtpLoginForm.tsx`: Updated captions, aria-labels, register subtitles, and footnotes to emphasize saving quality surplus food and smiling to the earth.
  - `MarketFooter.tsx`: Enhanced footer description and bottom brand signature.
  - `LoqmeExplainer.tsx`: Updated interactive explainer scenes to communicate food rescue, eco-friendly impact, and mindful consumption.
  - `CustomerPickupPassModal.tsx`: Updated post-pickup success note thanking customers for food rescue and caring for nature and the neighborhood.
  - `orders/page.tsx`: Updated empty state description to invite customers to join food rescue and nature preservation.

### Verified: Google Search Console; sitemap processing pending (2026-10-04)

Verified `https://loqme.shop/` ownership using the added HTML token, preserving previous ownership. Commit `c5b0550` deployed successfully (run 37185092517); 10 SEO tests, workspace types and CI pass. Homepage already indexed; live test passes and recrawl request accepted. Sitemap submitted and resubmitted once after Google's live fetch succeeded, but its report still says Couldn't fetch; processing success remains pending. Manual actions/security reports show no issues. See [PERSIAN_SEO.md](PERSIAN_SEO.md).

### Delivered: CP-10.19 Android launch and authentication security (2026-10-04)

User-authorized repairs/push delivered as `69fb507`: Android TWA targets official `loqme.shop`, uses a persistent signed release and verified app/site associations. Login defaults to existing accounts, blocks missing/disabled users before SMS, applies throttles/body/origin checks and retires public account-role lookup. Production JWT signing rejects default/missing secrets; profile logo sizing is consistent. **936/936 CI tests across 75 suites**, three retention tests, 9 optimized-build browser cases, build/lint/workspace types pass. Production run 37169339205 and Android release run 37169339257 succeeded. Safe old-image retention repaired a full server disk (now 36 GB free). Live readiness, assetlinks, retired account API and cross-origin OTP rejection pass. No runtime dependency vulnerabilities; an unpatched development-only braces advisory and physical Android acceptance remain. See [CP10_19_ANDROID_AUTH_SECURITY.md](CP10_19_ANDROID_AUTH_SECURITY.md). Existing M11 and provider gates remain open.

### Implemented: CP-10.18 Persian brand SEO (2026-10-03)

User requested visibility for «لقمه» alongside Loqme and explicitly authorized pushing code. Added static server-visible homepage brand heading/introduction outside the discovery Suspense boundary, linked WebSite/Organization JSON-LD, homepage/explore canonicals, Persian site-name consistency, login/register noindex and sitemap cleanup. **10/10 focused SEO tests, 3/3 optimized-build browser tests, production build, lint and all workspace typechecks pass.** Browser acceptance covers JavaScript disabled and 360/390/1440px widths; 390px screenshot inspected. Local database was unavailable, so sitemap fallback was exercised; dynamic records are mocked in focused tests. Push/deployment confirmation and Google recrawl/ranking evidence remain separate operational steps. See [PERSIAN_SEO.md](PERSIAN_SEO.md). Existing M11 coverage and provider gates remain open.

### Delivered: Tagline Refinement & Login Account Existence Guard (2026-10-03)

- **Brand Tagline**: Replaced «خوب بخور، کمتر خرج کن» with «طعم‌های تازه، انتخابی هوشمندانه» across `AuthLayout.tsx`, `README.md`, and `docs/BRAND.md`.
- **Login Account Existence Check**: Enforced account existence verification before OTP code dispatch on `/login` and via `authService.requestOtp` when `mode: 'login'` or `checkExists: true`. Unregistered mobile numbers receive HTTP 404 with code `ACCOUNT_NOT_FOUND` and no OTP SMS is dispatched.
- **Dedicated Register Route & Mode Switch**: Added `/register` route and segmented mode toggle in `OtpLoginForm`. When a user attempts to log in with an unregistered number, a clear, friendly Persian alert box displays with a 1-click CTA button to register with the same pre-filled mobile number.
- **Check-Account Endpoint**: Created `/api/auth/check-account` supporting both `GET` and `POST` for instant mobile number registration checks.
- **Test Coverage & Verification**: Added 9 new unit/route contract tests (`tests/auth-account-check.test.ts`) and 2 new UI interaction tests in `tests/otp-login-form.test.tsx`. All 18 OTP form tests, 14 route contract tests, and full production build pass with 0 errors.

### Active: M11 coverage and regression repairs (2026-10-03)

User explicitly requested 100% coverage and defect repair. The latest complete fresh disposable PostgreSQL/PostGIS run passed **917/917 tests across 73 suites with no skips**, with **60.63% lines, 58.76% statements, 47.50% functions and 52.19% branches** using Vitest 5.0.3. Strict 100% thresholds remain unmet. Repairs cover authentication/ownership/privacy, OTP expiry, gateway and amount validation, timezone-safe inventory/pickup inputs, transactional order/pickup completion, refund concurrency, historical financial reporting, CSV export and browser request/camera lifecycles. Dependency audit is zero; types and lint pass. Production build passes. All 95 browser cases pass; both focused listing-publication cases pass after the final clock-comparison fix. **CP-11.9 remains active; neither 100% coverage nor production readiness is established.** See [TEST_COVERAGE_AUDIT.md](TEST_COVERAGE_AUDIT.md).

### Active: CP-10.17 Login persistence (2026-09-28)

Reproduced the user-reported post-OTP account login loop in an optimized browser build. Login now confirms a persisted session and starts a fresh document to discard anonymous router redirects; protected responses and all session states are private/no-store. 269/269 fresh disposable-database tests, production build, lint and web/shared types pass. All 95 browser cases pass, including real database-backed OTP/profile/reload/logout and the formerly failing redirect regression. Production release verification is pending. See [CP10_17_LOGIN_PERSISTENCE.md](CP10_17_LOGIN_PERSISTENCE.md). Existing provider/device gates remain open.

### Delivered: CP-10.16 Store photos and business finder (2026-09-28)

Required merchant covers before publication, required product photos, legacy photo editing, city-scoped business-name search and a polished fixed-center-pin map are implemented. 266/266 disposable-database tests pass. All 92 browser cases are validated (89 full-run passes plus three corrected cases rerun); production build, lint and web/shared types pass. Commit `64937cf` deployed successfully in [run 36349502841](https://github.com/MobinGholizadeh/loqme/actions/runs/36349502841). Live search, center-pin confirmation, mobile layout, login and readiness pass with zero runtime errors. See [CP10_16_STORE_MEDIA.md](CP10_16_STORE_MEDIA.md). Existing provider/device gates remain open.

### Delivered: CP-10.15 Search, merchant loading and mobile reliability (2026-09-24)

User-requested fixes cover business search, map-to-products loading, photo delivery, footer size, mobile zoom/layout and heading focus. Commit `1eac59c` deployed successfully in [run 35963057596](https://github.com/MobinGholizadeh/loqme/actions/runs/35963057596), including full disposable-database CI acceptance. 86/86 browser tests, build, lint and types pass. Live search, mobile bounds, compact footer and readiness pass with zero browser errors. After Docker recovery, a real local merchant also returns its products and ratings successfully. SMS was reopened at the user's request on 2026-09-27: the running container lacked the API key because deployment reused a stale Compose manifest. The repair and permanent workflow fix `afcd0fe` deployed successfully in run 36333252694. A second provider issue was identified: bulk sends report blacklist status. Production now uses the existing Loqme verification template; the final real OTP returns HTTP 200/success and the provider confirms the verification service line. Handset receipt remains unconfirmed. See [PRODUCTION_SMS_REPAIR.md](PRODUCTION_SMS_REPAIR.md). See [CP10_15_RELIABILITY.md](CP10_15_RELIABILITY.md).

### Completed: CP-10.14 Mobile discovery, pickup details and quieter guidance (2026-09-22)

User-authorized follow-up adds a teal footer with a large scrolling Loqme signature, removes the homepage explainer card, introduces dismissible customer-login guidance, simplifies authenticated mobile navigation and displays a phone-verification entry for guests. Listing details add circular back/share/favorite controls, merchant-declared packaging and pickup instructions; unrated stores retain empty rating bars with 0.0 visual values. Monthly signed sessions remain 30 days; OTP verification is required before session creation, so there is no fabricated unverified-account state. Packaging uses existing listing attributes, without migration or production reseeding. See [CP10_14_MOBILE.md](CP10_14_MOBILE.md).

237/237 tests in 27 suites pass on fresh disposable PostgreSQL. Production build, lint and web/shared types pass. 79/79 browser tests pass on the optimized preview, including responsive layouts, axe accessibility, login guidance, reduced motion, session refresh, packaging edits and explainer/PWA regressions. Visuals inspected at 360/390/768/1440px. UI commit `002a00a` deployed successfully in run 35749616079. The follow-up Doppler deployment repair `ea557ae` passed image build and production deployment in [run 35906914457](https://github.com/MobinGholizadeh/loqme/actions/runs/35906914457). Live footer, guide/login/dismissal, mobile guest notice, cities and readiness passed again on 2026-09-24, with zero browser errors. See CP10_14_MOBILE.md. Rotation of the previously committed SMS.ir credential remains an owner action; existing provider/device gates remain open.

### Completed: CP-10.13 Navigation, rating rows, Persian tags and onboarding cities (2026-09-22)

User-requested follow-up implements a full-width centered-logo header with scroll blur, horizontal review rows on merchant/listing pages, Persian dietary/allergen labels and an idempotent Urmia reference-data migration for the empty production city list. The local shop HTTP 500 was reproduced and repaired after backup and verified migration-history reconciliation. Real local listing/merchant APIs now return 200 with rating aggregates. No production demo data is seeded. See [CP10_13_PRESENTATION.md](CP10_13_PRESENTATION.md).

232/232 tests in 26 suites pass on a fresh disposable database; build, lint, shared/web types and five-width browser/axe checks pass. All 71 browser cases are validated (70 full-run passes plus the corrected mobile-label assertion rerun). Implementation `4a2b9d6` and validation follow-up `adbf39b` are on `master`; [run 35708693920](https://github.com/MobinGholizadeh/loqme/actions/runs/35708693920) passed image build and remote deployment. Live header/scroll blur, Urmia selection and manual business entry, health, and explainer playback pass with no observed runtime errors. User explicitly authorized pushing these changes. Existing operational gates remain open.

### Completed: CP-10.12 Merchant ratings, availability, map controls and explainer (2026-09-22)

Follow-up validation (2026-09-22): corrected first-frame timing that could index scene -1, and prevented stale development-worker CSS. Production styles now refresh online while remaining cached for offline use. 16/16 relevant browser tests, actual development-worker recovery, build, lint and web/shared types pass; follow-up `b40ff1f` deployed successfully after a registry timeout retry. See the follow-up section in [CP10_12_MARKETPLACE.md](CP10_12_MARKETPLACE.md).

Implemented verified customer review dimensions and independent server aggregates, visible unavailable offers with authoritative reservation eligibility, safe stock reconciliation, isolated map controls and the lazy-loaded Persian 30-second purchasing guide. The user authorized pushing `master` and verifying deployment. Release workflow now backs up and verifies the database, migrates before replacing the app, preserves the previous image and checks readiness. See [CP10_12_MARKETPLACE.md](CP10_12_MARKETPLACE.md) for contracts, recovery caveats and release evidence.

Fresh disposable database acceptance: **230/230 tests in 25 suites**. Production build, web/shared typechecks and lint pass. **64/64 browser tests** pass; merchant/explainer layouts were visually inspected at 360/390/768/1440px with zero axe violations. Local Docker build was blocked by Alpine repository TLS verification; GitHub container build and remote deployment succeeded on retry. Commit `32c557e` is deployed to `loqme.shop`; server logs confirm verified backup, review migration and readiness. Live homepage/health/search/discovery return 200 and explainer interactions pass. Public discovery has zero offers and no merchant sitemap entries, limiting live record-specific checks. Existing CP-10.11 live SMS/Map.ir/device gates remain open. No production reseeding or fabricated reviews.

Earlier checkpoint entries below retain their original acceptance snapshots; the current release evidence above supersedes their deployment state, but does not close provider/device gates.

### Active: CP-10.11 Authentication & Business Onboarding (2026-09-21)

User-pushed Stage 1 is `ea129ac`. Stage 2 continues full-screen customer/business SMS authentication, five-step store registration, Map.ir adapter/manual fallback, application status and atomic admin approval. Stage 2 fixes OTP replay/attempt enforcement, keyboard pin editing, restored rejected drafts, closed-day/null pickup validation, bounded request/provider bodies and mobile banner stretching.

Current evidence: **218/218 tests in 24 suites** passed on fresh `loqme_onboarding_test_acceptance_20260921` using serial suites, and **51/51 browser tests** passed on the optimized preview (18 onboarding tests plus 33 existing regressions). Web/shared types, lint and the final production build pass. All six requested viewport screenshots were manually inspected; entry screens and the application-review dialog have zero axe violations. Actual local APIs return 503/manual fallback without the dedicated Map.ir key, 400 for an unsupported city, and 401 for unauthenticated applicant/admin reads, all with no-store headers. See [AUTH_ONBOARDING.md](AUTH_ONBOARDING.md) for contracts, scope and evidence, and [AI_HANDOFF.md](AI_HANDOFF.md) for continuation instructions.

This checkpoint is not deployed. Primary DB and environment files are unchanged. Dedicated `MAPIR_API_KEY`, live SMS and real-device keyboard acceptance remain operational gates. Historical production-ready claims below apply to the previous release only.

### Completed: Map.ir Persian Tile Provider Integration (2026-09-20)

Integrated Iranian local map provider **Map.ir** for marketplace discovery map tiles (`MarketplaceMap.tsx`), configured with `NEXT_PUBLIC_MAP_API_KEY`.
- Tile endpoint configured to Map.ir EPSG:3857 PNG tiles (`https://map.ir/shiveh/xyz/1.0.0/Shiveh:Shiveh@EPSG:3857@png/{z}/{x}/{y}.png?x-api-key=...`) with proper attribution and maxZoom 20.
- Next.js CSP updated in `apps/web/next.config.mjs` to whitelist `https://map.ir` and `https://*.map.ir` for `img-src` and `connect-src`.
- Configured environment variables in `.env`, `.env.example`, `apps/web/src/core/config.ts`, `docker-compose.yml`, and `docker-compose.prod.yml`.
- Wired `NEXT_PUBLIC_MAP_API_KEY` and `NEXT_PUBLIC_APP_URL` into multi-stage `Dockerfile` (builder & runner args/envs), compose manifests, and `.github/workflows/deploy.yml` CI/CD build-args and remote SSH server `.env` synchronization to ensure client JavaScript bundles bake the Map.ir key in production.
- Integrated Doppler (doppler.com) as unified secret manager for local dev (`dev`) and production (`prd`) with `doppler.yaml`, `package.json` sync scripts (`env:pull`, `env:push`, `env:pull:prod`, `env:push:prod`), `.env.production.example`, and GitHub Actions deployment integration.
- Updated browser test suite (`secondary-flows.spec.ts`) to handle Map.ir tile network conditions; verified 5/5 Playwright tests pass and Next.js production build succeeds.

### Completed: CP-10.10 Merchant Account Administration (2026-09-14)

Follow-up UI fixes (2026-09-15): fixed the security-audit page response mapping (`items`), centered loading states in the available viewport, converted portal tables to compact mobile card rows where applicable, and removed user-facing emoji decoration in favor of text and existing icon controls. Audit route accessibility regression passes on the optimized preview at mobile and desktop widths. ESLint and the production build pass after these changes.

Implemented per-store admin settings with linked owner identity/phone/status management, independently confirmed owner replacement, scoped order pagination and staff summaries. Account changes require an audit reason and commit atomically with the audit record; stale ownership, cross-store accounts and admin-account assignment are rejected. Persistent root session UI removes the logged-out flash. Authentication remains phone/OTP; no plaintext password display, impersonation or new migrations.

Final validation: **192/192 Vitest tests in 20 suites** on fresh disposable `loqme_account_test_final_20260914`; **33/33 browser tests** with route matrices at 360/390/768/1440/1920px; four account tests rerun after screenshot focus restoration. Lint has no warnings/errors, explicit web/four shared package TypeScript checks pass, and production `.next-account-build` succeeds. Live isolated API checks confirm all five merchant sections, 15 role boundaries, six category publications, WebP upload serving, all-region labels, inactive-session rejection, old-owner access removal, new-owner access and three atomic audit records. No main database reseeding or account reassignment was performed.

Docker was restarted successfully. User Compose/favicon commits `1d1b59b` and `cf7944e` are preserved. Both Compose configurations validate; upload volumes persist with non-root ownership. Docker image build could not fetch the `node:20-alpine` token from Docker Hub due to a network timeout; container build/runtime is not certified. The native preview at `http://localhost:3003` returns HTTP 200 and database readiness succeeds. At the final check, the main database had zero currently valid published offers, so the feed correctly shows an empty state. User now authorizes delivery to `master` and pushing Docker files; no deployment is included. Provider/device gates and previous Lighthouse evidence remain in `STITCH_REDESIGN.md`.

### Completed: CP-10.9 Merchant Feedback (2026-09-14)

Implemented role-aware navigation/merchant authorization (including pickup queue), canonical categories/temperature, gallery and illustrative photos, and paginated all-region discovery with city/neighborhood labels. Validation: 180/180 Vitest on a fresh disposable DB, 29/29 browser tests, lint, explicit web/shared typechecks and production build pass. Live disposable API smoke verified 15 role checks, six category publications with persisted images, public WebP serving and region labels. Main data was not reseeded; preview on port 3003 returned two active listings. Purchase-role policy is unchanged. Concurrent user commit `2b4f637` included generated `.next-feedback-build` artifacts; it was not reverted or rewritten. `.next-*/` is now ignored for future untracked build outputs.

### Active Checkpoint: CP-10.8 Stitch Redesign (2026-09-13)

The historical milestone sign-offs below describe the previous release. `codex/stitch-ui-redesign` implements CP-10.8 across customer discovery/auth/details/checkout/profile, shared controls, merchant/admin shells, dialogs and system states. Existing user logo/favicon/manifest changes are preserved. No merge or deployment was performed.

Baseline: web TypeScript passed, lint had six warnings, and unavailable PostgreSQL caused five failing Vitest suites. After the user started Docker, the two existing pending migrations were applied with explicit approval and a pre-migration backup. Final integration validation passes **160/160 tests across 16 suites** in an isolated seeded database; lint has zero warnings/errors; explicit web and four shared-package typechecks pass; production build passes. Browser checks cover 22 tests, 27 routes and five viewport sizes, including decoded images, accessibility and real offline service-worker behavior. Lighthouse homepage/login both score **94 performance / 100 accessibility / 100 best practices / 100 SEO**. Full evidence and remaining device/provider acceptance checks are in `docs/STITCH_REDESIGN.md`. Local preview: `http://localhost:3003`. The local database currently has no unexpired published inventory, so real discovery correctly shows an empty state.

| Metric | Status |
| :--- | :--- |
| **Current Milestone** | **CP-10.16 — Store photos and business finder** |
| **Milestone Status** | CP-10.16 deployed and verified; production OTP template configured; handset/device gates remain open |
| **Overall Completion** | Historical roadmap complete; CP-10.16 release evidence tracked separately |
| **Repository State** | Monorepo Active (`apps/web`, `packages/*`, PostgreSQL 15 + PostGIS 3.4 running, Dockerized) |
| **Last Updated** | 2026-09-28 (CP-10.16 / SMS repair) |

---

## 2. Technology Stack & Operational Environment

* **Runtime**: Node.js `v24.16.0` (validation on Windows host); Node 24 Alpine production image
* **Package Manager**: `npm` `11.17.0` with npm workspaces (`apps/*`, `packages/*`)
* **Monorepo Architecture**:
  * `apps/web`: Next.js 16.3.5 (App Router), React 19, TypeScript 5, Leaflet 1.9
  * `apps/mobile`: [Future] React Native / Expo Client
  * `packages/types`: `@loqme/types` (Domain contracts, RBAC, API wrappers, Marketplace, Orders, Payments, Financial Transactions, Moderation, Reviews, Complaints, AuditLogs, Merchant Portal DTOs)
  * `packages/validation`: `@loqme/validation` (Zod schemas, Iranian mobile, Checkout, Reviews, Complaints, Fast Listings, Staff, Store Settings)
  * `packages/design-tokens`: `@loqme/design-tokens` (White + Teal palette, Emil Kowalski motion)
  * `packages/api`: `@loqme/api` (Universal fetch-based API client, Bearer & Cookie auth)
  * `packages/config`: `@loqme/config` (Shared tsconfig presets)
* **Database**: PostgreSQL 15 with PostGIS 3.4 (Active via Docker container `loqme-postgres` on port 5432)
* **ORM & Migrations**: Prisma ORM `v7.10.0` with migrations (complete source: `prisma/migrations`):
  * `0001_init_auth_users`
  * `20260906201522_core_domain_entities`
  * `20260907000300_add_favorites_table`
  * `20260907001800_orders_payments_ledger` (Reservation, Order, Payment, FinancialTransaction, Refund)
  * `20260910000000_pickup_verification` (PickupVerification)
  * `20260910010000_trust_safety_moderation` (Review, Complaint, AuditLog)
* **Security & Auth**: Universal Dual-Mode Auth (CSPRNG 5-digit OTP, signed `jose` JWT via either `Authorization: Bearer <token>` or HttpOnly `loqme_session` cookie)
* **Styling**: Centralized Token Architecture in `@loqme/design-tokens`, Vazirmatn font, RTL-first (`dir="rtl"`)
* **Version Control**: Git initialized on `master` branch

---

## 3. Milestone Completion Summary

| Milestone | Title | Status | Completion % |
| :--- | :--- | :--- | :--- |
| **M00** | **Project Discovery & Architecture** | `Completed` | `100%` |
| **M01** | **Application Foundation** | `Completed` | `100%` |
| **Post-M01** | **Mobile-Readiness Architecture Refactor** | `Completed` | `100%` |
| **M02** | **Core Domain & Database** | `Completed` | `100%` |
| **M03** | **Marketplace Discovery** | `Completed` | `100%` |
| **M04** | **Orders, Inventory & Payments** | `Completed` | `100%` |
| **M04-UI** | **UI/UX & Design System Checkpoint** | `Completed` | `100%` |
| **M05** | **Pickup Verification** | `Completed` | `100%` |
| **M06** | **Trust, Safety & Moderation** | `Completed` | `100%` |
| **M07** | **Merchant Product** | `Completed` | `100%` |
| **M08** | **Admin Platform** | `Completed` | `100%` |
| **M09** | **Marketplace Analytics** | `Completed` | `100%` |
| **M10** | **UX, SEO, PWA & Performance** | `Completed` | `100%` |
| **M11** | **Production Readiness** | `Completed` | `100%` |

---

## 4. Completed Milestones Checklists

### Milestone M00 Checklist
- [x] **C0.1 — Repository Inspection**: Completed environmental inspection.
- [x] **C0.2 — Authoritative Governance Setup**: Authored authoritative `AGENTS.md` and `README.md`.
- [x] **C0.3 — Product & Behavioral Architecture**: Authored `PRODUCT.md`, `PRODUCT_PRINCIPLES.md`, `UX_PSYCHOLOGY.md`, and `BRAND.md`.
- [x] **C0.4 — System Design & Token Architecture**: Authored `DESIGN_SYSTEM.md` and `ARCHITECTURE.md`.
- [x] **C0.5 — Domain & Economic Modeling**: Authored `DATA_MODEL.md` and `BUSINESS_MODEL.md`.
- [x] **C0.6 — Safety, Security & Legal Registries**: Authored `SECURITY.md`, `FOOD_SAFETY.md`, and `LEGAL_ASSUMPTIONS.md`.
- [x] **C0.7 — Roadmap & Milestone Specifications**: Authored `ROADMAP.md` and all 12 individual milestone specification files (`M00` through `M11`).
- [x] **C0.8 — Final Consistency Audit & M00 Sign-off**: Signed off and transitioned to M01.

### Milestone M01 Checklist
- [x] **CP-01.1**: Initialize Next.js 14, TypeScript, ESLint, and vitest configuration.
- [x] **CP-01.2**: Configure design tokens, CSS variables, and Vazirmatn font in RTL mode (`globals.css`).
- [x] **CP-01.3**: Configure PostgreSQL database (Docker Compose) and Prisma ORM setup (`0001_init_auth_users` migration applied, seeded).
- [x] **CP-01.4**: Build Auth Domain Service, CSPRNG OTP generation, rate limiting, and signed session cookie middleware.
- [x] **CP-01.5**: Build base UI primitives (`Button`, `Input`, `Card`, `Badge`, `Modal`, `Spinner`) with Emil Kowalski motion tokens.
- [x] **CP-01.6**: Build Customer, Merchant, and Admin layout shells.
- [x] **CP-01.7**: Write unit and integration tests (18 tests passing); verify clean production build (`npm run build` exit code 0).

### Post-M01 Mobile-Readiness Refactor Checklist
- [x] **CP-MR.1 — Architecture Audit**: Comprehensive audit of Web coupling, auth transport, validation, tokens, and boundaries.
- [x] **CP-MR.2 — Monorepo Workspaces Setup**: Migrated repository to npm workspaces (`apps/*`, `packages/*`); relocated Web to `apps/web`.
- [x] **CP-MR.3 — Shared Types Extraction**: Extracted `@loqme/types` containing RBAC hierarchy, user/session contracts, and domain models.
- [x] **CP-MR.4 — Shared Validation Extraction**: Extracted `@loqme/validation` containing Zod schemas and universal Persian string/digit utilities.
- [x] **CP-MR.5 — Shared Design Tokens Extraction**: Extracted `@loqme/design-tokens` with White + Teal palette and motion curves.
- [x] **CP-MR.6 — Universal API Client**: Implemented `@loqme/api` supporting normalized error handling and dual Bearer/Cookie transport.
- [x] **CP-MR.7 — Universal Dual-Mode Auth**: Upgraded backend auth route handlers and middleware to accept `Authorization: Bearer <token>` and return `token` in JSON response.
- [x] **CP-MR.8 — Documentation Suite**: Authored `docs/MOBILE_ARCHITECTURE.md`, `docs/decisions/ADR-001-mobile-architecture.md`, and updated `AGENTS.md` and `ROADMAP.md`.
- [x] **CP-MR.9 — Validation Suite**: 25/25 Vitest tests passing, 0 TypeScript errors (`tsc --noEmit`), 0 ESLint warnings, production build exit code 0.

### Milestone M02 Checklist
- [x] **CP-02.1 — Prisma Schema Expansion**: Defined core domain models (`Province`, `City`, `Neighborhood`, `MerchantLocation`, `MerchantHours`, `Category`, `Listing`, `ListingImage`, `ListingInventory`, `ListingSafety`, `ListingAttributes`) and enums (`ListingType`, `ListingStatus`, `SafetyStatus`, `TemperatureRequirement`).
- [x] **CP-02.2 — PostGIS & Database Constraints**: Applied migration `20260906201522_core_domain_entities` with PostGIS 3.4 extension, auto-sync geography trigger, GIST spatial index (`idx_merchant_location_geom`), and PostgreSQL check constraints (`chk_inventory_non_negative`, `chk_listing_price_consistency`, `chk_listing_pickup_window`).
- [x] **CP-02.3 — Core Domain Services**: Built `MerchantService` (with PostGIS `ST_Distance` and `ST_DWithin` radius search), `ListingService` (atomic transaction creation with price/window guards), and `InventoryService` (atomic reservation and anti-overselling locks).
- [x] **CP-02.4 — Persian Seed Suite (Urmia First, Tehran Expansion)**: Seeded West Azerbaijan (Urmia) with 7 neighborhoods (دانشکده، شیخ‌تپه، استادان، خیام، کاشانی، بهداری، امام) as Phase 1 launch market, plus Tehran with 5 neighborhoods, 6 food categories, 12 authentic merchants, and 25 realistic surplus listings (Surprise Bags & Flash Deals) with authentic Toman pricing.
- [x] **CP-02.5 — Validation & Integration Tests**: 35/35 tests passing across 6 suites verifying PostGIS queries (in both Urmia and Tehran), atomic domain provisioning, and database check constraint enforcement.

### Milestone M03 Checklist
- [x] **CP-03.1 — PostGIS Spatial Discovery API**: Implemented `/api/listings/nearby` with PostGIS `ST_DWithin` and `ST_Distance` queries, supporting coordinate parameters, radius boundaries, business types, and distance ordering.
- [x] **CP-03.2 — Homepage Discovery Shell & Hero**: Built dynamic hero banner («امروز چه طعم تازه‌ای در محله شما منتظر کشف است؟»), Urmia neighborhood selector (دانشکده، شیخ‌تپه، استادان، خیام، کاشانی، بهداری، امام) + Tehran, category pills, and view switcher.
- [x] **CP-03.3 — Leaflet Interactive Map**: Implemented `MarketplaceMap` with custom SVG Teal brand pins, count badges, Urmia/Tehran quick-recenter buttons, GPS locator, and bottom sheet merchant preview on pin tap.
- [x] **CP-03.4 — Search, Category & Radius Filtering**: Implemented `FilterModal` with radius options (500m to 25km), business type pills, and dietary preferences; debounced (300ms) search across titles, merchants, and categories.
- [x] **CP-03.5 — Surprise Bag & Flash Deal Detail Views**: Built `/listings/[id]` with guaranteed value floor, original vs discounted pricing in Toman, net savings banner, pickup window countdown, allergen declarations, and food safety clearance badge.
- [x] **CP-03.6 — Merchant Profile & Favorites System**: Applied migration `20260907000300_add_favorites_table`, built `/merchants/[id]` profile view with operating hours and active listings, plus `/api/merchants/[id]/favorite` dual-mode toggle endpoint.
- [x] **CP-03.7 — Discovery Tests & Validation**: 46/46 vitest tests passing across 7 suites (`tests/m03-discovery.test.ts`), Next.js production build exit code 0, 0 TypeScript errors, 0 ESLint warnings.

### Milestone M04 Checklist
- [x] **CP-04.1 — ReservationService & Atomic Inventory Locking**: Built 10-minute hold reservation service with atomic conditional update (`WHERE (total - reserved - sold) >= $quantity`), auto-release background sweep, and customer cancellation.
- [x] **CP-04.2 — Checkout Summary UI & Live 10-Min Countdown**: Built `/checkout/[reservationId]` with live countdown timer, order item summary, net customer savings indicator, gateway selector, and terms acceptance.
- [x] **CP-04.3 — IPaymentGateway Abstraction & Gateways**: Implemented `IPaymentGateway` interface, `MockPaymentGateway` (for dev and tests), and `ZarinpalGatewayAdapter` (for production IPG transactions).
- [x] **CP-04.4 — Server Payment Verification & Webhook Endpoint**: Built `/api/payments/verify` handling both browser redirects (with automated redirect to `/orders/[id]/receipt`) and headless webhook POST calls with authoritative server-side amount matching.
- [x] **CP-04.5 — OrderService State Machine**: Built human-readable order number generator (`LQ-XXXXX`), state transitions (`PENDING_PAYMENT` → `PAID` → `READY_FOR_PICKUP` → `COMPLETED` / `CANCELLED` / `REFUNDED`), and customer cumulative savings tracker.
- [x] **CP-04.6 — Double-Entry Financial Ledger Records**: Built `FinancialTransaction` accounting entries tracking gross customer payment (debit `CUSTOMER_PAYMENT`, credit `PLATFORM_CLEARING`), merchant payable (credit `MERCHANT_PAYABLE`), and 10% platform commission cut (credit `PLATFORM_COMMISSION`).
- [x] **CP-04.7 — Concurrency Stress Test Suite**: 53/53 tests passing across 8 suites (`tests/m04-orders-payments.test.ts`), verifying 20 simultaneous threads competing for the last 2 surplus bags: exactly 2 succeed, 18 rejected with zero overselling.

### M04 UI/UX & Design System Checkpoint Checklist
- [x] **CP-UI.1 — White + Deep Teal Design Tokens**: Centralized platform-neutral tokens in `@loqme/design-tokens` with CSS variable generator, semantic color aliases (`--color-primary`, `--color-primary-hover`, `--color-primary-soft`, `--color-background`, `--color-surface`, `--color-text`, `--color-border`), Emil Kowalski motion press curves, and shimmer animations in `globals.css`.
- [x] **CP-UI.2 — Reusable UI Primitives Suite**: Built and upgraded core UI primitives in `apps/web/src/components/ui/`: `Skeleton` + `CardSkeleton` (eliminates dramatic layout shifts), `Select` (custom RTL dropdown replacing browser defaults), `EmptyState` (purposeful iconography and action CTA), `ErrorState` (user-friendly error recovery), `Button` (5 variants with micro-press physics), `Input` (teal focus rings and RTL icon support), `Card`, and `Badge`.
- [x] **CP-UI.3 — Customer Shell & Header Navigation**: Built responsive `CustomerShell` featuring desktop top navigation with Deep Teal brand typography («لقمه - کشف هوشمند»), Urmia launch city indicator badge, mobile bottom nav with active pill indicators, and full Persian trust footer.
- [x] **CP-UI.4 — Discovery & Listing Surface Overhaul**: Redesigned `/` landing page and `/explore` marketplace into a high-density discovery experience with Urmia neighborhood selector, category carousels, explicit net customer savings callouts (`سود شما: XX,XXX تومان`), food safety clearance badges, and pickup window countdowns.
- [x] **CP-UI.5 — Checkout, Receipt & Orders Flow Polish**: Polished `/checkout/[reservationId]` with live 10-minute hold countdown timer, `/orders/[id]/receipt` with complete payment confirmation and pickup directions, and `/orders` with tabbed order history, skeleton loading, and empty states.
- [x] **CP-UI.6 — Accessibility, RTL & Cross-Viewport Validation**: Full accessibility pass (proper ARIA attributes, semantic landmarks, high contrast ratios, touch targets >= 44px). Validated RTL layout across Desktop (1280px), Tablet (768px), and Mobile (390px) via browser subagent recording (`design_system_inspection_1788728557320.webp`).
- [x] **CP-UI.7 — Authoritative Governance & Design System Docs**: Updated `docs/DESIGN_SYSTEM.md` with complete token tables and component usage; updated `AGENTS.md` with strict rules prohibiting browser-default UI and mandating production-quality UI across all milestones.
- [x] **CP-UI.8 — Design Template & Official Logo Alignment**: Integrated user's official sprout-glyph logo into SVG vector component `<LoqmeLogo />`, `favicon.ico`, `favicon.svg`, `icon.svg`, and `logo.png`. Applied full visual design system from the provided design template: Deep Teal (`#135E66`), Mint Green accent (`#65CF9B`), Warm Cream canvas (`#FAF7F5`), Dark Charcoal typography (`#222026`), full pill buttons (`rounded-full`), hero banner with branded bag photography, Deep Teal category navigation ribbon, warm mission statement card, 4-photo lifestyle showcase grid, and full Deep Teal branded trust footer. Production build exit code 0.

### Milestone M05 Checklist
- [x] **CP-05.1 — PickupService & Dynamic Cryptographic QR Tokens**: Implemented `PickupService` with HMAC-SHA256 rotating QR tokens (60-second client refresh, 180-second sliding validity window) and 4-digit CSPRNG numeric OTP generator (`apps/web/src/domain/pickup/pickup.service.ts`). Added `PickupVerification` database entity, indexes, and migration `20260910000000_pickup_verification`.
- [x] **CP-05.2 — Customer Pickup Credentials Screen**: Built interactive `CustomerPickupPassModal` with dynamic QR display, auto-refresh countdown circle, high-brightness contrast toggle, large 4-digit Persian OTP (`۸۴۹۱`) with copy button, store directions link (Google Maps), store contact, and celebration screen upon handoff completion («نوش جان! امیدواریم از لقمه‌تان لذت ببرید.»). Integrated directly into `/orders/[id]/receipt` and `/orders`.
- [x] **CP-05.3 — Merchant Live Pickup Queue**: Implemented `/api/merchant/pickup/queue` returning active orders ready for pickup with customer details, masked phone (`۰۹۱۲***۴۳۲۱`), order code, bag title, quantity, and pickup countdown.
- [x] **CP-05.4 — HTML5 QR Scanner & Web Audio Chime**: Built `QRCameraScanner` using native HTML5 camera stream with camera flip (rear/front), permission error fallback, and animated laser scan line; implemented Web Audio API synthesizer (`apps/web/src/lib/utils/audio.ts`) providing C-major arpeggio success chime and error buzzer with zero external assets. Upgraded `/merchant/orders` to a live queue dashboard with 4-digit keypad and instant verification actions.
- [x] **CP-05.5 — Atomic Verification Handshake & Double-Pickup Prevention**: Built `/api/pickup/verify` endpoint verifying merchant staff authorization (`canScanPickup: true` or owner), rate-limiting lockout (max 5 failed attempts locks verification for 15 minutes), and PostgreSQL atomic concurrency lock (`UPDATE "PickupVerification" SET isVerified = true WHERE orderId = $1 AND isVerified = false`). Subsequent scans return HTTP 409 Conflict with exact previous timestamp.
- [x] **CP-05.6 — No-Show Worker & Pickup Reminders**: Built automated sweeper `sweepNoShows()` transitioning uncollected orders past `pickupEnd` to `NO_SHOW` (`/api/pickup/no-show`), and automated 45-minute pickup reminder detection.
- [x] **CP-05.7 — Validation & Concurrency Stress Test Suite**: Cryptographic HMAC generation and 180s expiration unit tests passing (5/5 tests in `tests/m05-pickup.test.ts`); 5-thread simultaneous double-pickup concurrency test implemented; Next.js 14 production build exit code 0 across all 25 routes; TypeScript typecheck (`npx tsc --noEmit`) 0 errors; ESLint 0 errors.

### Milestone M06 Checklist
- [x] **CP-06.1 — ListingSafety State Machine & Checkout Lockdown**: Implemented automated checks preventing reservation hold or order checkout for any listing whose `safetyStatus` is not `APPROVED` (`apps/web/src/domain/reservation/reservation.service.ts` and `apps/web/src/domain/order/order.service.ts`). Added `Review`, `Complaint`, and `AuditLog` Prisma schema models and SQL migration `20260910010000_trust_safety_moderation`.
- [x] **CP-06.2 — Post-Pickup Verified Customer Review Loop**: Built `submitReview` and `replyToReview` in `ModerationService`, strictly restricted to buyers of verified `COMPLETED` orders with atomic merchant rating recalculation (`ratingAverage`, `ratingCount`). Built `/api/reviews` and `/api/reviews/[id]/reply`. Built `ReviewModal` with 3 category star ratings (Overall, Food Quality, Value-for-Money) and Persian comments. Displayed verified reviews and merchant replies on `/merchants/[id]`.
- [x] **CP-06.3 — Customer Complaint Filing & Food Safety Escalation Threshold**: Built `submitComplaint` in `ModerationService` and `/api/complaints`. Added multi-photo evidence uploader `/api/complaints/upload` (validates MIME types, max 5MB, UUID renaming). Implemented automated food safety threshold detection (if a merchant receives $\ge 2$ complaints for `EXPIRED_FOOD` or `SPOILED_FOOD` in 7 days, all their listings are automatically transitioned to `RESTRICTED` / `PAUSED` and an `AUTOMATED_SAFETY_LOCKOUT` audit entry is created).
- [x] **CP-06.4 — Admin Moderation Console & 1-Click Refund**: Built full admin moderation dashboard at `/admin/moderation` with critical food safety alert banners, complaint filtering by status, photo evidence lightbox preview, safety status override modal, and 1-click refund authorization (`/api/admin/complaints/[id]/resolve`).
- [x] **CP-06.5 — Refund Execution & Double-Entry Financial Ledger Reversal**: Extended `IPaymentGateway` and `PaymentService.refundPayment` to execute gateway refunds, settle `Refund` records (`SETTLED`), transition `Payment` and `Order` to `REFUNDED`, and write balanced double-entry accounting transactions debiting `MERCHANT_PAYABLE` (penalty) and crediting `PLATFORM_CLEARING`.
- [x] **CP-06.6 — Immutable Audit Logging Service**: Implemented `AuditService` and `/api/admin/audit` to record tamper-proof audit trails for all safety overrides, reviews, complaints, automated lockouts, and administrative refund decisions. Connected live audit log stream to `/admin/audit`.
- [x] **CP-06.7 — Validation & Test Suite**: Authored 15 tests in `tests/m06-trust-safety.test.ts` (15/15 passing in Vitest); Next.js 14 production build (`npm run build`) exit code 0 across 30 routes; TypeScript typecheck (`npx tsc --noEmit`) 0 errors; ESLint 0 errors.

---

### Milestone M07 Checklist — Merchant Product

- [x] **CP-07.1 — Merchant Dashboard Overview & Real-Time KPIs**: Built `/merchant` with live polling for active listings, today's sold bags, pending pickups queue count, gross revenue (Toman), net payout balance (Toman, 10% commission cut), rating average, and active pickup window alert banner with countdown timer.
- [x] **CP-07.2 — Under 60-Second Rapid Listing Creator**: Built `FastListingModal` with 4 preset category templates (Bakery, Pastry, Restaurant meals, Cafe/Salads), automatic discount percentage badge calculation, safety declaration checklist, and instant marketplace publishing.
- [x] **CP-07.3 — Active Listing & Inventory Management**: Built `/merchant/listings` with 1-tap pause/resume toggle (`PUBLISHED` ↔ `PAUSED`) providing optimistic UI feedback and instant search visibility reflection, plus atomic stock stepper (`+` / `-`) preventing stock drops below reserved/sold limits.
- [x] **CP-07.4 — Storefront Location Map Pin Editor**: Built interactive entrance coordinates picker in `/merchant/settings` allowing merchants to fine-tune exact storefront latitude and longitude for customer proximity discovery.
- [x] **CP-07.5 — 7-Day Operating Hours & Pickup Schedule**: Built weekly Sat–Fri schedule editor in `/merchant/settings` with `isOpen` toggle, store open/close times, default pickup start/end windows, and 1-click batch application to all weekdays.
- [x] **CP-07.6 — Staff Management & Multi-Tenant Access Control**: Built `/merchant/staff` allowing store owners to invite employees by Iranian mobile number, assign roles (`MANAGER`, `CASHIER`), and revoke staff access with confirmation dialogs.
- [x] **CP-07.7 — Financial Settlement Statements & Ledger**: Built `/merchant/finance` with GMV calculations, 10% platform commission breakdown, net payable balance, Sheba (شبا) bank account verification display, and full double-entry ledger transactions history.
- [x] **CP-07.8 — Tenant Security & Workflow Verification Suite**: Authored 15 tests in `tests/m07-merchant.test.ts` (15/15 passing) verifying Zod validation, fast listing prefill, atomic stock adjustment, financial calculations, owner RBAC, and strict multi-tenant boundary isolation (preventing cross-store edits).

---

### Milestone M08 Checklist — Admin Platform

- [x] **CP-08.1 — Admin Layout Shell, Navigation & Real-Time KPIs**: Built `/admin` overview dashboard with 8 dedicated sub-navigation routes (`/admin`, `/admin/merchants`, `/admin/customers`, `/admin/listings`, `/admin/moderation`, `/admin/finance`, `/admin/audit`, `/admin/settings`), real-time operational cards (Active Merchants, Pending Verifications, Suspended Stores, Active Bags, 24h GMV, Platform Commission, Open Complaints), quick-action links, and infrastructure health telemetry (`apps/web/src/app/(admin)/admin/page.tsx`, `apps/web/src/components/shells/AdminShell.tsx`).
- [x] **CP-08.2 — Merchant Verification & Governance Console**: Built `/admin/merchants` with status filters (`ALL`, `PENDING`, `APPROVED`, `SUSPENDED`, `REJECTED`), live search by business name, license, or mobile, full merchant detail modal with guild permit inspection, per-merchant custom commission rate adjustment, and 1-click status overrides with mandatory reason recording (`/api/admin/merchants`, `/api/admin/merchants/[id]`). Implemented automated transaction protection: whenever a store is suspended or rejected, all its active published listings are atomically transitioned to `PAUSED`.
- [x] **CP-08.3 — Customer Profile & Purchase History Inspector**: Built `/admin/customers` with live customer search, registration date, active status badges, total cumulative savings, order count, complaint history summary, and administrative account active status toggle (`/api/admin/customers`, `/api/admin/customers/[id]`).
- [x] **CP-08.4 — Global Listing & Category Manager**: Built `/admin/listings` providing cross-merchant listing search, category filtering, price and stock inspection, food safety status pills, and category hierarchy manager (`/api/admin/categories`) with modal for creating new categories (slug, Persian title, icon URL) with duplicate slug conflict detection.
- [x] **CP-08.5 — Dispute Resolution & Refund Console**: Connected centralized moderation workflow at `/admin/moderation` with customer complaint triage, photo evidence lightbox, safety classification override modal, and 1-click gateway refund triggering double-entry ledger reversals (`/api/admin/complaints/[id]/resolve`).
- [x] **CP-08.6 — Commission Rule Engine & Settlement Exporter**: Built `/admin/finance` calculating aggregate platform GMV, platform commission cuts, customer refunds deducted, and net payable balances per merchant. Added 1-click Paya bank transfer CSV exporter (`لوقمه_تسویه_پایا_...csv`) generating formatted Sheba (شبا) transfer rows for Iranian banking portals (`/api/admin/finance/settlements`).
- [x] **CP-08.7 — Audit Log Viewer & System Configuration**: Built `/admin/settings` providing platform maintenance mode toggle, emergency announcement banner editor, and active SMS provider switcher (`MOCK`, `SMS_IR`). Built `/admin/audit` rendering immutable event stream with actor, role, action, target entity, timestamp, and JSON diff viewer (`/api/admin/audit`, `/api/admin/settings`).
- [x] **CP-08.8 — Admin Security & Verification Suite**: Authored 21 tests in `tests/m08-admin.test.ts` (21/21 passing) verifying Zod validation, strict RBAC gatekeeper (`requireAdminSession` returning 401 for unauthenticated and 403 for `CUSTOMER`/`MERCHANT_OWNER`/`MERCHANT_STAFF`), merchant verification state transitions, automatic listing pausing on suspension, customer deactivation, settlement mathematical accuracy, and tamper-proof audit logging.

---

### Milestone M09 Checklist — Marketplace Analytics

- [x] **CP-09.1 — AnalyticsService Core Calculation Engine**: Implemented `AnalyticsService` executing SQL aggregations across operational tables (`Order`, `OrderItem`, `Payment`, `Listing`, `ListingInventory`, `Refund`, `Customer`) calculating GMV, platform commission, AOV, net merchant payouts, and cumulative customer savings strictly from actual transactions (`apps/web/src/domain/analytics/analytics.service.ts`).
- [x] **CP-09.2 — Indexed Operational Performance Rollups**: Structured query filters on indexed range keys (`createdAt >= :start AND createdAt <= :end`) and status enums (`PAID`, `READY_FOR_PICKUP`, `COMPLETED`, `REFUNDED`, `NO_SHOW`) ensuring sub-200ms retrieval.
- [x] **CP-09.3 — Admin Marketplace Analytics Console (`/admin/analytics`)**: Built comprehensive operational intelligence portal with timeframe filters (`TODAY`, `7D`, `30D`, `90D`, `1Y`), KPI cards, operational ratios bar, category donut chart, and customer cohort retention cards (`apps/web/src/app/(admin)/admin/analytics/page.tsx`, `apps/web/src/app/api/admin/analytics/route.ts`).
- [x] **CP-09.4 — Interactive Native SVG Visual Charts**: Implemented `TrendChart` (continuous line and gradient area chart with hover tooltips and Persian numerals) and `CategoryDonutChart` (SVG donut slices with interactive hover highlights and responsive legend) with zero heavy external charting dependencies (`apps/web/src/components/analytics/TrendChart.tsx`, `apps/web/src/components/analytics/CategoryDonutChart.tsx`).
- [x] **CP-09.5 — Hyper-Local Geographic Neighborhood Density**: Built `NeighborhoodDensityTable` analyzing and ranking Urmia neighborhoods (دانشکده، خیام، گلشهر، بهداری، ایثار، شیخ‌تپه) by order volume, GMV, merchant supply, and unmet demand scores (`apps/web/src/components/analytics/NeighborhoodDensityTable.tsx`).
- [x] **CP-09.6 — CSV Financial & Operational Exporter**: Built `/api/admin/analytics/export` generating standardized UTF-8 BOM CSV files with Persian column headers for financial auditing and operational reviews (`apps/web/src/app/api/admin/analytics/export/route.ts`).
- [x] **CP-09.7 — Mathematical Verification & Security Test Suite**: Authored 12 tests in `tests/m09-analytics.test.ts` (12/12 passing) verifying mathematical accuracy of GMV, Commission, AOV, Sell-Through %, Pickup Completion %, Customer Savings, and strict admin RBAC protection.

### Milestone M10 Checklist — UX, SEO, PWA & Performance

- [x] **CP-10.1 — PWA Manifest, Service Worker & Install Prompt**: Implemented native Next.js App Router Web App Manifest (`apps/web/src/app/manifest.ts`) with Persian app name («لقمه | عرضه هوشمند مازاد روزانه غذا»), standalone display mode, official Deep Teal theme (`#135E66`), and high-res vector icons. Implemented custom Service Worker (`apps/web/public/sw.js`) with `/offline` navigation fallback and strict bypass for authenticated routes (`/api/*`, `/admin/*`, `/merchant/*`, `/checkout/*`). Created Persian offline screen (`apps/web/src/app/offline/page.tsx`) and mobile A2HS prompt banner with 2-step iOS Safari modal guide (`apps/web/src/components/pwa/PwaInstallPrompt.tsx`).
- [x] **CP-10.2 — Dynamic SEO, Open Graph & Sitemap / Robots**: Implemented comprehensive Persian Open Graph and Twitter Card tags in root layout (`apps/web/src/app/layout.tsx`). Built dynamic XML sitemap (`apps/web/src/app/sitemap.ts`) indexing static pages (`/`, `/explore`, `/login`), active verified merchants (`/merchants/[id]`), and published listings (`/listings/[id]`). Built dynamic `robots.txt` handler (`apps/web/src/app/robots.ts`) allowing public indexing while shielding admin, merchant, api, checkout, and order private routes.
- [x] **CP-10.3 — Schema.org JSON-LD Structured Data**: Built structured data generator library (`apps/web/src/lib/seo/structured-data.ts`) producing Google Rich Results compliant schemas: `Schema.org/LocalBusiness` (coordinates, Persian address, opening hours) on `/merchants/[id]`, and `Schema.org/Product` + `Schema.org/Offer` (Toman price, stock availability, seller details) on `/listings/[id]`.
- [x] **CP-10.4 — Shimmer Skeletons & Resilient Error Handling**: Created geometric shimmer loading skeletons (`apps/web/src/components/ui/ListingSkeleton.tsx`) matching exact card dimensions. Built global client error boundary with Persian retry copy (`apps/web/src/app/error.tsx`) and custom Persian 404 page (`apps/web/src/app/not-found.tsx`).
- [x] **CP-10.5 — Persian Typography & Numeral Rendering**: Verified Vazirmatn font-display swap, Persian numeral transformations (`toPersianDigits`), and Toman currency formatting (`formatToman`) with thousand separators and Persian digits.
- [x] **CP-10.6 — Image Optimization Pipeline**: Configured `next.config.mjs` with AVIF and WebP next-gen format support and responsive device image sizing.
- [x] **CP-10.7 — Verification Test Suite & Production Build**: Authored 9 unit tests in `tests/m10-ux-seo-pwa.test.ts` (9/9 passing). Ran comprehensive 91-test suite across all non-DB modules (100% passing). Verified Next.js 14 production build (`npm run build`) exit code 0 across all 32 static/dynamic routes.

### Milestone M11 Checklist — Production Readiness

- [x] **CP-11.1 — Comprehensive Security & Configuration Hardening**: Configured mandatory enterprise HTTP security headers in `next.config.mjs` (Content Security Policy, Strict-Transport-Security HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy). Hardened environment schema validation in `apps/web/src/core/config.ts` enforcing 32+ character secrets, valid database URIs, and preventing default placeholder secrets in production mode (`STRICT_PROD_CHECK`).
- [x] **CP-11.2 — Payment Gateway Failover, Idempotency & Concurrency Hardening**: Added `checkGatewayHealth()` to `PaymentService` for proactive gateway health probing. Verified idempotency guards against duplicate verification callbacks, race conditions, and network timeout handling without inventory leakage.
- [x] **CP-11.3 — Database Connection Pooling & Graceful Shutdown**: Configured Prisma connection pool optimization, slow query logging threshold, and container shutdown signal traps (`SIGTERM`, `SIGINT`) executing graceful `prisma.$disconnect()`.
- [x] **CP-11.4 — Structured Observability, Health Probes & Log Redaction**: Built structured JSON logger (`apps/web/src/lib/logger.ts`) with automatic redaction of sensitive credentials (passwords, OTPs, auth tokens, session secrets, cookies, card numbers, and national codes). Implemented lightweight liveness probe (`/api/health/live`) and database readiness probe (`/api/health/ready`).
- [x] **CP-11.5 — Multi-Stage Production Dockerfile & Container Orchestration**: Authored multi-stage `Dockerfile` (Alpine Node 20, non-root user `nextjs:nodejs`, standalone build output < 200MB). Authored `docker-compose.prod.yml` orchestrating `loqme-postgres` and `loqme-web` with internal healthcheck network routing. Authored production reverse proxy templates (`docker/Caddyfile` and `docker/nginx.conf`) with automatic SSL/TLS termination and domestic CDN cache rules.
- [x] **CP-11.6 — Automated Database Backup & Disaster Recovery Drill**: Authored automated backup shell script (`scripts/backup-db.sh`) and cross-platform TypeScript utility (`scripts/backup-db.ts`) with gzip compression, SHA256 integrity checksums, 30-day retention pruning, and restore verification drills.
- [x] **CP-11.7 — Final Legal & Food Safety Audit**: Conducted formal production audit against `docs/FOOD_SAFETY.md` and `docs/LEGAL_ASSUMPTIONS.md`. Confirmed technical enforcement of Article 38 cooling-off exceptions, zero-expired-food database constraints, and transparent 10% commission accounting. Signed off Section 3 in `docs/LEGAL_ASSUMPTIONS.md`.
- [x] **CP-11.8 — Final Sign-Off & Full Verification Suite**: Authored 14 tests in `tests/m11-production-readiness.test.ts` (14/14 passing). Executed full test suite across all 10 modules (105/105 tests passing). Verified clean TypeScript typecheck (`npx tsc --noEmit` 0 errors) and successful production Next.js build with standalone output (`npm run build` exit code 0). Transitioned project to **`Production Ready`** (100% completion).

---

## 5. Important Technical Decisions

1. **Multi-Client Monorepo (`apps/*` + `packages/*`)**: Standard npm workspaces without heavy tooling overhead; provides instant sharing of types, schemas, tokens, and API client.
2. **Native Mobile via React Native & Expo**: Explicitly rejected WebView wrapper in favor of native hardware capabilities, push notifications, and 60fps gesture performance (documented in `ADR-001`).
3. **Universal Dual-Mode Authentication**: Backend middleware and routes accept both `Authorization: Bearer <token>` (Mobile) and `loqme_session` HttpOnly cookie (Web).
4. **Backend Sole Authority**: Authoritative business rules, pricing, inventory locks, and financial ledger remain strictly on the backend.
5. **Platform-Neutral Design Tokens**: Single source of truth in `@loqme/design-tokens` exported as pure TypeScript objects with Web CSS custom property helper.
6. **PostGIS Native Spatial Indexing**: Stores coordinates in `MerchantLocation` with an automated trigger populating PostGIS `geography(Point, 4326)` and indexed using GIST (`idx_merchant_location_geom`) for high-performance sub-millisecond radius search.
7. **Database-Level Guardrails**: Enforced price validity (`discounted < original`), inventory integrity (`total >= reserved + sold`), and pickup window chronological validity directly in PostgreSQL via check constraints.
8. **Urmia-First Launch Strategy**: Initial commercial rollout, neighborhood density building, merchant onboarding, and operational learning starts in **Urmia (ارومیه)**, followed by expansion to Tehran.
9. **Interactive Leaflet Map with SSR Disabled**: Dynamic import with `ssr: false` avoids SSR `window` errors in Next.js App Router while rendering custom White + Teal markers with active bag counts.
10. **Atomic Conditional SQL Concurrency Defense**: Inventory reservation and purchase execution use single atomic updates checking `(totalQuantity - reservedQuantity - soldQuantity) >= $quantity` directly in PostgreSQL, completely eliminating race conditions without heavy distributed locks.
11. **Double-Entry Financial Ledger**: All monetary transfers record dual balanced entries (`CUSTOMER_PAYMENT`, `PLATFORM_CLEARING`, `MERCHANT_PAYABLE`, `PLATFORM_COMMISSION`) to provide an auditable accounting foundation.
12. **Automated Food Safety Circuit Breaker**: If $\ge 2$ food safety incidents (`EXPIRED_FOOD`, `SPOILED_FOOD`) are reported against a merchant within 7 days, all merchant listings are atomically flipped to `RESTRICTED` / `PAUSED`, halting new reservations until administrative health guild clearance.
13. **Dynamic HMAC-SHA256 Rotating QR Tokens**: Customer pickup passes rotate every 60 seconds with a sliding 180-second validation window, defeating static screenshots and unauthorized sharing while tolerating client-server clock drift.
14. **PostgreSQL Atomic Double-Pickup Defense**: Verification handshakes execute atomic conditional updates `UPDATE "PickupVerification" SET "isVerified" = true WHERE "orderId" = $1 AND "isVerified" = false`. Under concurrent scanning attempts, exactly 1 succeeds and all remaining requests receive count = 0, returning HTTP 409 Conflict with previous completion timestamp.
15. **Web Audio API Client-Side Synthesizer**: Implemented pure in-browser synthesized auditory feedback (C-major arpeggio chime and 180Hz buzzer) via Web Audio API oscillators, eliminating latency and external audio asset network dependencies.
16. **Verified Buyer Review Boundary**: Reviews cannot be fabricated or submitted arbitrarily; only authenticated buyers of completed orders can submit a review, strictly once per order.
17. **Multi-Tenant Scoped Domain Queries & RBAC**: Every merchant endpoint evaluates `resolveMerchantAndAuthorize` to ensure callers cannot inspect or mutate resources outside their assigned store. Cashiers are strictly restricted to pickup queue scanning, while financial records and staff invitations require Owner role.
18. **Strict Admin Gatekeeper Protocol (`requireAdminSession`)**: All administrative routes and mutations enforce `session.role === 'ADMIN'`. Non-admin sessions (Customer, Cashier, Merchant Owner) are rejected with HTTP 403, and missing/corrupted sessions return HTTP 401.
19. **Atomic Listing Pause on Merchant Suspension**: To preserve customer safety and marketplace integrity, suspending or rejecting a merchant executes an atomic transaction that simultaneously pauses all active `PUBLISHED` listings of that store, instantly removing them from public exploration and proximity search.
20. **Protected Non-Negative Settlement Balances**: Settlement math dynamically applies merchant-specific commission tiers (`grossGmv * commissionPercent / 100`), deducts customer refunds, and enforces a zero floor (`Math.max(0, netPayable)`) to prevent negative payout liabilities.
21. **Mandatory Administrative Audit Logging**: Every administrative mutation (approvals, suspensions, customer status overrides, commission adjustments, category creations, system settings) writes an immutable audit record containing actor ID, role (`ADMIN`), action type, entity type, entity ID, and JSON details.
22. **Zero-Fabrication Analytics Architecture**: All analytics computations strictly aggregate real database rows without synthetic constants, random mock values, or predictive fabrications, in strict compliance with Loqme Product Principles.
23. **Lightweight Accessible Native SVG Charting**: Interactive area/line trends and category donut distributions are implemented with pure SVG math and CSS transitions, eliminating heavy chart library bundle bloat while ensuring 100% RTL and Persian numeral support.
24. **Service Worker Security Isolation**: The service worker explicitly bypasses all authenticated mutations, checkout paths, and administrative consoles (`/api/*`, `/admin/*`, `/merchant/*`, `/checkout/*`), ensuring session tokens and financial transactions are never cached offline.
25. **Native Next.js 14 SEO Route Handlers**: Replaced legacy static text files with type-safe App Router conventions (`manifest.ts`, `sitemap.ts`, `robots.ts`), enabling automated dynamic indexing of all active merchants and surplus listings with graceful DB-offline fallbacks.
26. **Schema.org Structured Data Injection**: Injected valid JSON-LD on merchant and listing pages, enabling Google Rich Results previews (ratings, opening hours, Toman pricing, and stock status) in Persian search engine results.
27. **Mobile A2HS Cross-Browser Architecture**: Handled iOS Safari's lack of `beforeinstallprompt` via progressive detection (`navigator.standalone`) and a contextual 2-step Persian instruction sheet, alongside native Chrome Android install triggers.
28. **Next-Gen AVIF/WebP Image Optimization**: Pre-configured responsive device break sizes and prioritized modern image compression formats (`AVIF`, `WebP`) in `next.config.mjs` to optimize mobile data consumption on Iranian mobile networks.
29. **Next.js Standalone Minimal Containerization**: Configured `output: 'standalone'` in `next.config.mjs` to produce a self-contained runtime bundle, shrinking Docker container image size to < 200MB on Alpine Linux without unneeded node_modules.
30. **Comprehensive HTTP Security Header Enforcement**: Applied enterprise security headers (CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy) protecting users against clickjacking, XSS, and MIME confusion attacks.
31. **Zero-Leak Structured Observability**: Structured JSON logging pipeline automatically redacts sensitive authentication credentials, OTPs, session keys, and payment tokens before outputting to log aggregators.
32. **Automated Container Health Probes**: Dual-probe architecture provides `/api/health/live` for process liveness and `/api/health/ready` for PostgreSQL query verification and latency monitoring.
33. **Cryptographically Verified Disaster Recovery**: Automated backup routines generate gzip-compressed database archives with SHA256 checksum verification, retention lifecycle management, and restore validation capabilities.

---

## 6. Known Limitations & Pre-Launch Operational Gates

| Area | Current State | Pre-Launch Operational Requirement |
| :--- | :--- | :--- |
| **Merchant Guild & Union License** | Technical platform and pilot data ready; union documentation prepared. | Final commercial sign-off from Virtual Business Union (اتحادیه کشوری کسب‌وکارهای مجازی). |
| **E-Namad & Live PSP Keys** | `ZarinpalGatewayAdapter` and Shaparak flow fully implemented and tested with sandbox keys. | Swap sandbox merchant ID with production E-Namad certified PSP merchant ID upon launch. |

---

## 7. Pending Decisions

1. **Primary SMS Provider**: Configured **SMS.ir** REST API v1 (`SmsIrNotificationService`) for production OTP and notification dispatch, with zero-credit `ConsoleMockNotificationService` for localhost/testing.
2. **Map Provider**: Confirm Leaflet tile provider (Neshan Map API vs OpenStreetMap).
3. **EAS Build Credentials**: Apple Developer Account and Google Play Console accounts for production mobile releases.

---

## 8. Latest Validation Results

* **Milestone M11 Test Suite**: 14/14 tests passing in `tests/m11-production-readiness.test.ts` (liveness probe, readiness probe, structured logger, credential redaction, standalone configuration, security headers, environment schema validation, gateway health check, backup creation, SHA256 integrity, backup corruption detection, and RBAC boundary isolation).
* **Comprehensive Test Suite**: 105/105 unit and domain tests passing across all 10 milestone suites (`tests/m11-production-readiness.test.ts`, `tests/m10-ux-seo-pwa.test.ts`, `tests/m09-analytics.test.ts`, `tests/m08-admin.test.ts`, `tests/m07-merchant.test.ts`, `tests/m06-trust-safety.test.ts`, `tests/rbac.test.ts`, `tests/persian.test.ts`, `tests/session.test.ts`, and `tests/shared-packages.test.ts`).
* **TypeScript Typecheck**: `npx tsc --noEmit` exited with code 0 (zero errors across all packages and apps).
* **ESLint Validation**: `npm run lint` reported 0 errors.
* **Production Build**: `npm run build` completed successfully (exit code 0, 32 static/dynamic routes compiled and optimized including `/manifest.webmanifest`, `/sitemap.xml`, `/robots.txt`, `/offline`, `/api/health/live`, `/api/health/ready`, with standalone output generated in `apps/web/.next/standalone`).
* **Container Hardening**: Multi-stage `Dockerfile` with non-root user `nextjs:nodejs`, `docker-compose.prod.yml`, and reverse proxy templates (`docker/Caddyfile`, `docker/nginx.conf`) fully validated.

