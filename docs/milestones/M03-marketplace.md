# Milestone M03 — Marketplace Discovery Specification

> **Milestone**: M03  
> **Title**: Marketplace Discovery  
> **Status**: `Completed`  
> **Target Completion**: 100%

---

# Objective

Deliver the hyper-local consumer marketplace discovery experience, enabling users to explore, filter, and discover surplus food listings (Surprise Bags & Flash Deals) via interactive maps, proximity radius queries, categories, search, and rich Persian listing detail views.

---

# Context

Discovery is the primary emotional hook of Loqme. Customers must feel the thrill of stumbling upon fresh culinary treasures in their neighborhood. This milestone connects the backend domain models created in M02 with a consumer-facing discovery interface.

---

# Dependencies

* **M02 — Core Domain & Database** (merchants, listings, inventory, and PostGIS queries operational).

---

# Scope

* Customer Discovery Homepage:
  * Dynamic hero banner with warm brand tone («امروز چه طعم تازه‌ای در محله شما منتظر کشف است؟»).
  * Neighborhood proximity selector (GPS geolocation or manual district selector).
  * Category carousel (نان و شیرینی، کافه، رستوران، سوپرمارکت، میوه و پروتئین).
  * "Surprise Bags Near You" card carousel.
  * "Flash Deals" highlighted section.
* Interactive Map View:
  * Leaflet map with custom Loqme store pins and active inventory badges.
  * Interactive bottom card showing merchant summary on pin tap.
* Filter & Search Modal:
  * Radius slider (500m, 1km, 3km, 5km, 10km).
  * Dietary tags (گیاه‌خواری، بدون گلوتن).
  * Price range slider and discount percentage filter.
  * Pickup window filter (عصرانه، پایان شب).
* Listing Detail Views:
  * **Surprise Bag View**: Guaranteed retail value floor, price comparison, allergen declarations, pickup time window, remaining stock countdown, and store location map snippet.
  * **Flash Deal View**: Explicit item identity, ingredients, portion, discount, and pickup window.
* Merchant Profile Page:
  * Store banner, address, operating hours, verified rating, active surplus listings, and customer review summaries.
* Favorites System:
  * Toggle favorite heart icon to save favorite neighborhood spots.

---

# Out of Scope

* Cart checkout, reservation holds, and online payments (M04).
* In-person pickup verification (M05).
* Customer review submission (M06).

---

# Functional Requirements

1. Proximity queries must utilize PostGIS `ST_DWithin` to return only listings within user-selected radius.
2. Listings with passed pickup windows (`pickupEnd < NOW()`) or zero available inventory (`total - reserved - sold == 0`) must not appear in active discovery.
3. Users can toggle store favorites with immediate visual feedback and persistent database storage.

---

# UX Requirements

1. Mobile-first ergonomics with fluid touch gestures, sticky bottom bar, and Persian typography.
2. Honest pricing display: Original price struck through, discount badge in warm orange, bold net Toman price.
3. Authentic scarcity: Displays literal count ("تنها ۲ بسته باقی مانده") without fabricated live-viewer counters.

---

# Technical Requirements

1. Server Components for initial page load and SEO; Client Components for Leaflet map and dynamic filter sheets.
2. Debounced search input (300ms) querying `/api/listings/search`.
3. Geospatial coordinates handled safely in decimal degrees (Tehran latitude ~35.6892, longitude ~51.3890).

---

# Database Requirements

* Query optimization: Index on `Listing(status, pickupEnd)` combined with PostGIS GIST spatial index.
* Favorite entity relationships: Customer-to-Merchant many-to-many join table.

---

# Security Requirements

* Sanitize all search query strings to prevent SQL or regex injection.
* Restrict maximum search radius to 25km to prevent expensive global spatial table scans.

---

# Testing Requirements

* **Unit Tests**: Filter logic, price calculations, and active pickup window evaluators.
* **Integration Tests**: PostGIS spatial query returning accurate merchants within 1km vs 5km.
* **E2E Tests**: Customer navigates homepage, filters by bakery, taps a pin on map, and opens Surprise Bag details.

---

# Acceptance Criteria

1. [x] Homepage displays active listings from seed database.
2. [x] Map view renders merchant pins with correct coordinates in Urmia and Tehran.
3. [x] Proximity filter returns only stores within selected distance.
4. [x] Surprise Bag detail page shows accurate original vs discounted Toman pricing.
5. [x] Authenticated customer can favorite/unfavorite merchants.

---

# Checkpoints

- [x] **CP-03.1**: Build PostGIS spatial discovery API (`/api/listings/nearby`).
- [x] **CP-03.2**: Build Homepage Discovery shell, hero, and category carousel.
- [x] **CP-03.3**: Implement Leaflet interactive map with custom pins and bottom sheet preview.
- [x] **CP-03.4**: Build Search, Category, and Radius filtering bottom sheet.
- [x] **CP-03.5**: Implement Surprise Bag and Flash Deal detail views.
- [x] **CP-03.6**: Implement Merchant Profile page with store details and favorite toggle.
- [x] **CP-03.7**: Run integration and E2E discovery tests; audit mobile responsiveness.

---

# Definition of Done

* Customer can find and view any active listing in under 3 taps.
* Spatial queries execute in < 50ms on local PostgreSQL.
* Checkpoints completed and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with M03 discovery test results.
