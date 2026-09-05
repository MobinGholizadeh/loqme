# Milestone M02 — Core Domain & Database Specification

> **Milestone**: M02  
> **Title**: Core Domain & Database  
> **Status**: `Pending`  
> **Target Completion**: 0%

---

# Objective

Implement and persist the core business domain models in PostgreSQL: Merchants, Locations, Categories, Listings (Surprise Bags & Flash Deals), Listing Inventory, and Food Safety metadata, complete with PostGIS spatial indexing, database constraints, core domain services, and comprehensive Persian seed data.

---

# Context

M02 establishes the business entity foundations for the marketplace. It transforms the conceptual data models defined in `docs/DATA_MODEL.md` into concrete, strongly-typed database tables and reusable domain services.

---

# Dependencies

* **M01 — Application Foundation** (database connectivity and base layout working).

---

# Scope

* Prisma schema definition for core domain entities:
  * `Merchant`, `MerchantLocation`, `MerchantHours`, `MerchantStaff`.
  * `Province`, `City`, `Neighborhood`.
  * `Category` (hierarchical).
  * `Listing`, `ListingImage`, `ListingInventory`, `ListingSafety`, `ListingAttributes`.
* PostGIS spatial geography point setup on `MerchantLocation.geom` with GIST index.
* Database constraints:
  * Non-negative inventory check (`totalQuantity >= reservedQuantity + soldQuantity`).
  * Price consistency check (`discountedPriceToman < originalPriceToman`).
  * Pickup window check (`pickupEnd > pickupStart`).
* Core Domain Services:
  * `MerchantService`: Create, update, and query merchant profiles.
  * `ListingService`: Create Surprise Bags and Flash Deals with price validation.
  * `InventoryService`: Initialize and monitor stock levels.
* Comprehensive Persian seed script (`prisma/seed.ts`):
  * Tehran neighborhoods (سعادت‌آباد، شهرک غرب، انقلاب، تجریش، صادقیه).
  * 10 realistic merchants (bakeries, specialty cafes, confectioneries, grocers).
  * 25 sample listings with authentic Toman pricing, pickup windows, and safety tags.

---

# Out of Scope

* Public search & map UI (M03).
* Customer reservations and checkout (M04).
* In-store pickup scanning (M05).

---

# Functional Requirements

1. Merchants can be registered with physical geographic coordinates (lat/long) in Tehran.
2. Merchants can publish both `SURPRISE_BAG` and `FLASH_DEAL` listings with guaranteed value baselines.
3. Every listing automatically provisions a corresponding `ListingInventory` record with atomic counters.
4. Food safety tags (`safetyStatus`, allergens, storage directions) must accompany every listing.

---

# UX Requirements

1. In development mode, developer UI or CLI tools allow rapid inspection of seeded listings.
2. Prices are strictly formatted in Toman with Persian digits in API responses.

---

# Technical Requirements

1. Strongly-typed Prisma models generating type-safe client types.
2. PostGIS raw SQL migrations for geometry columns and spatial distance queries.
3. Domain services encapsulate business logic and prevent invalid data states.

---

# Database Requirements

* Migrations: `0002_core_domain_entities` and `0003_postgis_spatial_indexes`.
* Foreign key cascades and check constraints active.
* Spatial index `CREATE INDEX idx_merchant_location_geom ON "MerchantLocation" USING GIST(geom);`.

---

# Security Requirements

* Only users with `MERCHANT_OWNER` or `ADMIN` can create or modify merchant listings.
* Server-side validation rejects listings where `discountedPrice >= originalPrice`.

---

# Testing Requirements

* **Unit Tests**: Domain service business rules (discount calculation, pickup window validation).
* **Integration Tests**: Prisma model persistence, spatial distance calculation (`ST_Distance`).
* **Seed Verification Test**: Script verifies that all seed data loads cleanly without constraint errors.

---

# Acceptance Criteria

1. [ ] Prisma migrations apply cleanly to PostgreSQL.
2. [ ] PostGIS spatial index successfully created.
3. [ ] Seed script executes and populates 10 merchants and 25 listings in Tehran.
4. [ ] Merchant can create and persist a Surprise Bag via `ListingService`.
5. [ ] Anti-overselling check constraint verified.

---

# Checkpoints

- [ ] **CP-02.1**: Define Prisma schema for Geography, Merchants, Categories, and Listings.
- [ ] **CP-02.2**: Write and apply PostgreSQL migrations including PostGIS spatial indexes.
- [ ] **CP-02.3**: Build `MerchantService` and `ListingService` domain logic.
- [ ] **CP-02.4**: Implement Persian seed script with authentic Tehran locations and listings.
- [ ] **CP-02.5**: Write integration tests validating database constraints and spatial queries.

---

# Definition of Done

* Seed script runs cleanly via `npm run db:seed`.
* Database constraints prevent invalid inventory or negative prices.
* Checkpoints verified and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Document seed credentials and test merchants in `docs/PROJECT_STATUS.md`.
