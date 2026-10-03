# CP-10.18 — Persian brand discovery

User-authorized SEO implementation and push, 2026-10-03. Target: associate Persian **لقمه** with **Loqme** and `https://loqme.shop/`, while retaining the Urmia-first positioning.

## Audit and implementation

Live pre-change HTTP checks returned 200 and existing Persian title/description and fa-IR localization. The initial homepage response lacked an H1, canonical and brand JSON-LD. The sitemap advertised login/registration and assigned request-time modification dates to static pages. The reported first position for “Loqme” is user evidence; no independent Google/Iran ranking baseline or Search Console access was available.

- Homepage now renders the visible Persian brand heading and introduction outside the client discovery Suspense boundary. It retains static generation; no extra database work or per-request rendering is introduced. Interactive location/filter controls remain in discovery.
- Homepage WebSite and Organization JSON-LD link Persian name `لقمه`, Latin alias `Loqme`, canonical URL and existing logo. No invented social profiles, company address, reviews or verification claims.
- Homepage has its own Persian-first title and canonical. Explore has a distinct title/description and self-canonical. No root canonical is inherited by unrelated pages.
- Open Graph site name is `لقمه`; Twitter copy matches the discovery positioning.
- Login/register receive `noindex, follow` and are removed from the sitemap. They remain crawlable so crawlers can read noindex. Static sitemap entries omit inaccurate modification dates; record modification dates remain unchanged.

## Acceptance

2026-10-03: 10/10 focused Vitest SEO tests and 3/3 optimized-build Playwright tests pass. Production build, lint and all workspace typechecks pass. Browser checks confirm one visible H1 without JavaScript, parseable brand JSON-LD, canonicals, auth noindex and no horizontal overflow at 360/390/1440px. A 390px screenshot was visually inspected. No claim of Google Rich Results or Search Console validation is made.

Focused schema/sitemap tests, optimized-build browser tests (including JavaScript disabled), mobile overflow checks, production build, lint and workspace types are required. Database-driven inventory and the complete M11 coverage goal are outside this checkpoint; local PostgreSQL was unavailable during initial preview checks, exercising the existing sitemap fallback.

## Search Console follow-through

After deployment, the property owner should:

1. Verify the `loqme.shop` domain property via Google's supplied DNS TXT record if it is not already verified. Do not invent a verification token.
2. Inspect `https://loqme.shop/`, run the live test, check rendered content and Google-selected canonical, then request indexing once.
3. Submit `https://loqme.shop/sitemap.xml` and review indexing/crawl errors.
4. Record a baseline and compare successive 28-day periods for exact queries `لقمه`, `Loqme`, `لقمه ارومیه`, `اپلیکیشن لقمه`, and `لقمه شاپ`: impressions, clicks, CTR and average position. Segment Iran/device where sufficient data exists; country signals can be affected by VPN use.
5. Use `لقمه (Loqme)` and the official URL consistently on genuine owned profiles and merchant partner references. Add schema sameAs only for verified existing profiles; avoid bought links or manufactured reviews. No outreach or external-profile changes were performed.

The short Persian word has meanings and competing uses beyond this brand. Correct markup improves clarity, not a guaranteed #1 ranking. Re-crawling can take days to weeks; ranking progress requires Search Console evidence over time.

## Primary references

- [Google site names](https://developers.google.com/search/docs/appearance/site-names)
- [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Request a recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
