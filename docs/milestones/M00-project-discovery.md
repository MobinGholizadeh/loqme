# Milestone M00 — Project Discovery & Architecture Specification

> **Milestone**: M00  
> **Title**: Project Discovery & Architecture  
> **Status**: `In Progress`  
> **Target Completion**: 100% (Documentation & Governance Foundation)

---

# Objective

Establish the authoritative project knowledge base, operational governance rules, technical architecture, and milestone specifications inside the repository so that all future agents and contributors can execute development autonomously and consistently without relying on conversation memory.

---

# Context

Loqme (لقمه) is a greenfield Persian-first marketplace project. Before writing application code, an authoritative source of truth must exist within the codebase to eliminate ambiguity surrounding product scope, business model, safety policies, legal assumptions, and architectural patterns.

---

# Dependencies

None. M00 is the root discovery and governance milestone.

---

# Scope

* Repository and runtime environment inspection.
* Technical architecture specification (Next.js, TypeScript, PostgreSQL, PostGIS).
* Complete documentation suite creation:
  * `AGENTS.md` (authoritative agent instructions)
  * `README.md` (onboarding and repository structure)
  * `docs/PRODUCT.md` (personas, listing types, user flows)
  * `docs/PRODUCT_PRINCIPLES.md` (15 permanent product principles)
  * `docs/UX_PSYCHOLOGY.md` (behavioral drivers, cognitive framing, anti-patterns)
  * `docs/BRAND.md` (brand voice, tone, visual rules, Vazirmatn font)
  * `docs/DESIGN_SYSTEM.md` (centralized CSS custom properties, RTL rules)
  * `docs/ARCHITECTURE.md` (application layers, domain services, integration abstractions)
  * `docs/DATA_MODEL.md` (entity schemas, constraints, lifecycle relationships)
  * `docs/BUSINESS_MODEL.md` (commission mechanics, unit economics, flywheel)
  * `docs/SECURITY.md` (RBAC, server-side validation, concurrency, payment security)
  * `docs/FOOD_SAFETY.md` (safety status state machine, prohibitions, health disclaimers)
  * `docs/LEGAL_ASSUMPTIONS.md` (legal registry, E-Commerce law, guild compliance)
  * `docs/ROADMAP.md` (M00 to M11 sequencing)
  * `docs/PROJECT_STATUS.md` (living tracker of milestone progress and risks)
* Milestone specification files (`docs/milestones/M00-project-discovery.md` through `M11-production.md`).

---

# Out of Scope

* Scaffolding product UI code or mock screens.
* Implementing database schemas or executing migrations.
* Implementing authentication or payment logic.
* Implementing customer, merchant, or admin screens.

---

# Functional Requirements

1. The repository must contain structured, discoverable markdown documentation for all system domains.
2. Every milestone must be broken into granular, testable, and resumable checkpoints.
3. The project status file must accurately reflect the real repository state at all times.

---

# UX Requirements

1. All documentation must strictly adhere to GitHub Flavored Markdown (GFM) with standard formatting, tables, code blocks, and alerts (`[!NOTE]`, `[!WARNING]`, `[!IMPORTANT]`, `[!CAUTION]`).
2. Persian strings and terms must use natural, modern Persian phrasing without literal machine translation artifacts.

---

# Technical Requirements

1. Files must be organized in standard directories: root, `docs/`, and `docs/milestones/`.
2. Paths and filenames must match the roadmap specifications exactly.
3. No conflicting or contradictory architectural decisions across files.

---

# Database Requirements

Conceptual data model documented in `docs/DATA_MODEL.md`. No active database migrations are executed in M00.

---

# Security Requirements

Security policies, untrusted client rules, and threat models must be formally defined in `docs/SECURITY.md`.

---

# Testing Requirements

* Documentation consistency audit: verify all referenced files exist.
* Verify brand naming (`Loqme`, `لقمه`, `loqme.shop`) is uniform across all documents.
* Verify markdown syntax and link integrity.

---

# Acceptance Criteria

1. [x] All 15 core architectural documents exist in `docs/` and root.
2. [x] All 12 milestone specification files exist in `docs/milestones/`.
3. [x] `AGENTS.md` is positioned as the authoritative agent instruction file.
4. [x] `PROJECT_STATUS.md` is initialized with milestone M00 marked in progress.
5. [x] No application or fake UI code has been written prematurely.

---

# Checkpoints

- [x] **CP-00.1**: Inspect environment, Node/npm versions, and workspace path.
- [x] **CP-00.2**: Author `AGENTS.md` and `README.md`.
- [x] **CP-00.3**: Author core domain documents (`PRODUCT.md`, `PRODUCT_PRINCIPLES.md`, `UX_PSYCHOLOGY.md`, `BRAND.md`).
- [x] **CP-00.4**: Author engineering documents (`DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `BUSINESS_MODEL.md`).
- [x] **CP-00.5**: Author compliance documents (`SECURITY.md`, `FOOD_SAFETY.md`, `LEGAL_ASSUMPTIONS.md`).
- [x] **CP-00.6**: Author roadmap and living status (`ROADMAP.md`, `PROJECT_STATUS.md`).
- [ ] **CP-00.7**: Author all milestone specification files (`M00` through `M11`).
- [ ] **CP-00.8**: Final consistency check and sign-off.

---

# Definition of Done

* All documentation files created and reviewed.
* Zero broken internal markdown file links.
* Repository is prepared for M01 execution.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` upon completion of checkpoint CP-00.8.
