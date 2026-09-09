# Milestone M09 — Marketplace Analytics Specification

> **Milestone**: M09  
> **Title**: Marketplace Analytics  
> **Status**: `Completed`  
> **Target Completion**: 100%

---

# Objective

Implement a high-integrity analytics engine calculating real, verifiable marketplace metrics derived strictly from live operational, order, and financial ledger data—including GMV, platform commission, Average Order Value (AOV), sell-through rates, pickup completion rates, refund rates, customer repeat cohorts, and hyper-local geographic supply density.

---

# Context

To scale efficiently and maintain investor and merchant trust, Loqme requires truthful, accurate analytical data. In strict accordance with our product principles, **analytics must derive from real database records—never fake or fabricate metrics.**

---

# Dependencies

* **M08 — Admin Platform** (order, settlement, and customer data operational).

---

# Scope

* Core Marketplace Financial Metrics:
  * **Gross Merchandise Value (GMV)**: Total gross sales processed within selectable date windows (Today, 7D, 30D, Custom Jalali Range).
  * **Platform Commission**: Net platform revenue earned (default: 10% of GMV).
  * **Average Order Value (AOV)**: Mean Toman basket size across Surprise Bags and Flash Deals.
  * **Merchant Payout Balance**: Total net liabilities owed to merchants.
* Operational Efficiency Metrics:
  * **Sell-Through Rate**: Percentage of published surplus bags purchased before pickup window closure.
  * **Pickup Completion Rate**: Percentage of paid orders successfully picked up vs. no-shows.
  * **Refund & Dispute Rate**: Percentage of orders resulting in customer refunds or safety complaints.
* Growth & Cohort Retention:
  * **Merchant Activation & Retention**: Number of merchants publishing ≥ 3 times per week.
  * **Customer Repeat Purchase Rate**: Percentage of users making a second purchase within 14 and 30 days.
  * **Customer Cumulative Savings**: Real total Toman saved by consumers across the platform.
* Hyper-Local Geographic Density Analytics:
  * Supply and demand breakdown by Tehran districts and neighborhoods (e.g. Sa'adat Abad vs. Enghelab).
  * Unmet demand indicators: High search volume in neighborhoods with low merchant listing density.

---

# Out of Scope

* Third-party invasive ad tracking pixels (Google Tag Manager, Facebook Pixel) that compromise user privacy.
* Machine-learning predictive forecast models (future scope).

---

# Functional Requirements

1. All metrics must execute SQL aggregation queries against production tables (`Order`, `OrderItem`, `Payment`, `Listing`, `ListingInventory`, `Refund`).
2. Analytics queries must never alter production database state.
3. Date filtering supports native Jalali calendar boundaries (e.g. Farvardin to Esfand).
4. No synthetic, hardcoded, or random numbers in any chart or KPI card.

---

# UX Requirements

1. Clean, interactive charts using lightweight charting library (Chart.js or Recharts) with RTL tooltips and Persian numerals.
2. Timeframe picker: امروز (Today), ۷ روز گذشته (Last 7 Days), ۳۰ روز گذشته (Last 30 Days), سال جاری (Current Year).
3. CSV export for accounting and financial auditing.

---

# Technical Requirements

1. Optimized SQL aggregations with indexed timestamp ranges (`createdAt >= :start AND createdAt <= :end`).
2. Read-only database replica support or materialized views for heavy historical aggregation if query execution exceeds 200ms.
3. Domain service `AnalyticsService` provides clean analytical data transfer objects (DTOs).

---

# Database Requirements

* Aggregation indexes: `Order(status, createdAt)`, `Listing(status, createdAt)`, `Payment(status, createdAt)`.
* Materialized view for daily rollups (`daily_marketplace_stats`).

---

# Security Requirements

* Detailed analytics views restricted strictly to `ADMIN` role.
* Merchants can only view aggregated analytics for their own store via the merchant portal.

---

# Testing Requirements

* **Unit Tests**: Accurate mathematical computation of GMV, Commission, AOV, and Sell-Through Rate.
* **Integration Tests**: Verify that analytical query totals match exact sum of individual order ledger rows.
* **Integrity Audit**: Automated test fails if any static or mock metric constant is discovered in the analytics pipeline.

---

# Acceptance Criteria

1. [x] GMV, commission, and AOV calculate accurately from real order database records.
2. [x] Sell-through and pickup rates reflect real inventory and verification states.
3. [x] Neighborhood density metric accurately ranks districts by transaction volume.
4. [x] Zero fabricated or randomized metrics exist in the codebase.
5. [x] CSV export generates valid financial summary sheets.

---

# Checkpoints

- [x] **CP-09.1**: Build `AnalyticsService` core calculation logic and aggregation queries.
- [x] **CP-09.2**: Create Materialized View / indexed rollup tables for historical performance.
- [x] **CP-09.3**: Build Admin Marketplace Analytics dashboard and KPI summary cards.
- [x] **CP-09.4**: Implement interactive visual charts (GMV growth, sell-through trend, pickup rate).
- [x] **CP-09.5**: Build Geographic Neighborhood Density heatmap table.
- [x] **CP-09.6**: Implement CSV financial report exporter.
- [x] **CP-09.7**: Run mathematical verification tests comparing raw order totals against analytical outputs.

---

# Definition of Done

* Analytics pipeline verified 100% against underlying database ledger entries.
* Performance: Analytics dashboard loads in < 500ms.
* Checkpoints completed and `docs/PROJECT_STATUS.md` updated.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with verified analytics benchmarks.
