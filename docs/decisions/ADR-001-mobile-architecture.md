# ADR-001: Native Mobile Architecture & Multi-Client Strategy

* **Status**: `Accepted`
* **Date**: 2026-09-06
* **Deciders**: Loqme Architecture Team
* **Consulted**: AGENTS.md Governance, Product & Design Engineering

---

## 1. Context & Problem Statement

Loqme is a Persian-first, hyper-local marketplace for discovering and purchasing surplus food from neighborhood bakeries, cafes, markets, and restaurants at attractive discounts.

Following the completion of Milestone M01 (Application Foundation), the product roadmap anticipates three primary client platforms:
1. **Web Application** (Desktop & Mobile Web)
2. **Native iOS Application** (iPhone)
3. **Native Android Application** (Android Smartphones)

A critical architectural decision was required before proceeding to M02+:
- Should Loqme build a mobile application as a thin WebView wrapper around the web application?
- Should Loqme develop separate, siloed backend implementations for Web and Mobile?
- Or should Loqme establish a unified, multi-client monorepo where Web and Mobile act as platform-specific clients consuming authoritative backend services and shared contracts?

---

## 2. Decision

We decide to adopt a **Multi-Client Architecture with Native React Native / Expo**:

1. **Native Client**: Loqme's future mobile client (`apps/mobile`) will be built with **React Native and Expo (TypeScript)**.
2. **Rejection of WebView**: WebView-in-a-box, Apache Cordova, and basic PWA wrappers are explicitly **rejected** for the core mobile app.
3. **Monorepo Structure**: The repository adopts an npm workspace structure separating `apps/*` from `packages/*`:
   - `apps/web`: Next.js 14 App Router (Web client & authoritative API routes)
   - `apps/mobile`: Future React Native / Expo application
   - `packages/types`: Shared domain contracts and RBAC types
   - `packages/validation`: Shared Zod validation schemas and Persian sanitizers
   - `packages/design-tokens`: Single source of truth for White + Teal visual palette and motion curves
   - `packages/api`: Universal, typed API client
4. **Backend Authority**: Authoritative business rules, pricing calculations, inventory reservations, food safety verification, and financial transactions live strictly on the server backend. Neither Web nor Mobile may act as the source of truth.
5. **Platform-Specific UI**: UI rendering, layout, gestures, and navigation remain native to each platform (HTML/CSS for Web; React Native primitives for Mobile).

---

## 3. Alternatives Considered & Rationale

### Alternative A: Progressive Web App (PWA) / Responsive Web Only
* **Pros**: Zero additional app store overhead; single codebase.
* **Cons Rejected**: Severely compromised customer and merchant pickup experience on iOS (limited background push notifications, restricted camera stream integration, no reliable geofencing, high bounce rate at retail checkout counter).

### Alternative B: Hybrid WebView Wrapper (Cordova / Capacitor)
* **Pros**: Fast to wrap existing Next.js pages in an app container.
* **Cons Rejected**: "Uncanny valley" interaction feel, poor Persian touch scrolling performance, clunky bottom sheet interactions, sluggish QR code scanning, and risk of Apple App Store guideline 4.2 rejection ("Minimum Functionality / Website in an App").

### Alternative C: Flutter
* **Pros**: High-performance canvas-based rendering engine; cross-platform iOS/Android.
* **Cons Rejected**: Introduces a completely different programming language (Dart), destroying the ability to share TypeScript domain types, Zod validation schemas, API contracts, and design token objects with the Next.js TypeScript backend.

### Alternative D: Native React Native / Expo (Chosen)
* **Rationale**:
  - **Shared Language & Ecosystem**: 100% TypeScript. Seamlessly consumes `@loqme/types`, `@loqme/validation`, `@loqme/design-tokens`, and `@loqme/api`.
  - **Native Performance**: 60/120fps native UI thread for maps, sliding cards, and Emil Kowalski spring animations.
  - **Full Hardware Access**: Native camera QR scanning (`expo-camera`), background push notifications (`expo-notifications`), encrypted storage (`expo-secure-store`), and geofencing (`expo-location`).
  - **Persian RTL Support**: Full native RTL layout support via React Native `I18nManager`.

---

## 4. Consequences & Governance

### Positive Consequences:
1. **Zero Domain Duplication**: A single set of Zod validation schemas and TypeScript contracts validates inputs across Web, Mobile, and the Backend.
2. **Consistent Visual Language**: Updating the White + Teal brand palette in `@loqme/design-tokens` propagates instantly to both Web CSS custom variables and Mobile StyleSheet tokens.
3. **Dual-Mode Auth**: Backend authentication routes accept either HttpOnly cookies (Web) or `Authorization: Bearer <token>` (Mobile) without divergent endpoints.
4. **Isolated Client Restructuring**: Developing `apps/mobile` later in `M-Mobile-01` requires zero restructuring of `apps/web` or existing backend domain services.

### Negative Consequences / Trade-offs:
1. **UI Code Separation**: UI components (`Button`, `Card`, `Shell`) must be implemented separately for React DOM and React Native.
2. **Package Boundary Discipline**: Engineers must strictly prevent browser-only APIs (`window`, `document`, `localStorage`) from leaking into `packages/*`.

---

## 5. Compliance & Rule Directives

* All future feature development (M02 through M11) must adhere to the multi-client model.
* No authoritative business rule or financial calculation may be implemented exclusively on the client.
* Web-only dependencies are strictly prohibited in `packages/types`, `packages/validation`, `packages/design-tokens`, and `packages/api`.
