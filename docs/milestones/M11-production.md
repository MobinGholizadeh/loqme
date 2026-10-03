# Milestone M11 — Production Readiness Specification

> **Milestone**: M11  
> **Title**: Production Readiness  
> **Status**: `Reopened — CP-11.9 in progress`
> **Target Completion**: 100%

---

# Objective

Conduct a rigorous end-to-end production readiness audit across security, authorization boundaries, database query performance, payment failover resilience, inventory concurrency defense, observability, environment hygiene, automated backup routines, and containerized deployment configuration to guarantee a secure, reliable launch on domestic Iranian infrastructure.

---

# Context

M11 is the final validation gate before public commercial launch. It ensures that every operational risk identified in `docs/PROJECT_STATUS.md` and `docs/LEGAL_ASSUMPTIONS.md` has been audited, that all security barriers are hardened, and that automated disaster recovery mechanisms are operational.

---

# Dependencies

* **M10 — UX, SEO, PWA & Performance** (all product features, UX polish, and PWA completed).

---

# Scope

* Comprehensive Security & Penetration Review:
  * Authorization boundary audit: verify strict tenant isolation on every API endpoint.
  * Server-side pricing enforcement: ensure zero possibility of client-side price tampering.
  * File upload security: verify MIME sniffing, magic number checks, and size limits.
  * Rate-limiting audit: stress test OTP, checkout, and search endpoints.
  * Secret leak check: automated scan confirming zero hardcoded credentials in git history.
* Payment & Financial Verification Audit:
  * Live PSP gateway connectivity test with production keys (Saman / Zarinpal).
  * Webhook idempotency and network timeout retry simulation.
  * Double-spend and duplicate callback defense verification.
* Database & Concurrency Hardening:
  * Slow query analysis: `EXPLAIN ANALYZE` on all spatial and listing queries.
  * Connection pool tuning for peak traffic spikes.
  * Automated PostgreSQL daily backup script with offsite retention.
* Observability & Logging:
  * Structured JSON application logging (Winston / Pino).
  * Error tracking integration (Sentry / GlitchTip).
  * Health check endpoints: `/api/health/live` and `/api/health/ready`.
* Deployment & Infrastructure:
  * Multi-stage production `Dockerfile` generating minimal Node.js Alpine container.
  * Docker Compose / PM2 configuration for container orchestration.
  * SSL/TLS certificate verification via reverse proxy (Nginx / Caddy).
  * Domestic Iranian CDN and hosting compatibility check (ArvanCloud / Liara).
* Final Acceptance & Legal Sign-off:
  * Audit against `docs/FOOD_SAFETY.md` and `docs/LEGAL_ASSUMPTIONS.md`.

---

# Out of Scope

* Post-launch marketing campaigns or merchant business development.

---

# Functional Requirements

1. `/api/health/ready` verifies database connectivity and returns HTTP 200 within 50ms.
2. System logs contain zero sensitive data (no passwords, OTPs, card numbers, or auth tokens).
3. Automated database backup script executes daily, encrypts the dump, and uploads to object storage.

---

# UX Requirements

1. Graceful offline and 500 error pages rendering in clean Persian brand aesthetics.
2. Fast global load time: Time to First Byte (TTFB) < 200ms on domestic Iranian connections.

---

# Technical Requirements

1. Multi-stage Docker build producing an image size < 200MB.
2. Non-root user execution inside Docker containers for security hardening.
3. Graceful shutdown handler capturing `SIGTERM` and closing open database connections cleanly.

---

# Database Requirements

* Automated PostgreSQL backup verification: Restore test executed on a staging database to verify backup integrity.
* Connection pool sizing configured for host memory limits (`max: 20`).

---

# Security Requirements

* Strict Content Security Policy (CSP), HSTS, X-Frame-Options, and X-Content-Type-Options headers active.
* All environment variables validated against strict Zod schema at container startup; abort boot if any key is missing.

---

# Testing Requirements

* **Security Penetration Tests**: Automated OWASP ZAP or equivalent scan.
* **Load / Stress Testing**: Simulate 200 concurrent active users browsing listings and reserving bags.
* **Disaster Recovery Drill**: Simulate database crash and verify restore time < 15 minutes.

---

# Acceptance Criteria

1. [x] Production readiness checklist passes 100% with zero open high-risk findings.
2. [x] Multi-stage Docker build passes and container boots cleanly.
3. [x] Health check endpoints respond accurately.
4. [x] Automated database backup and restore drill succeeds.
5. [x] Final repository documentation matches production deployment state.

---

# Checkpoints

- [ ] **CP-11.9 — Full-source coverage and regression repair (2026-10-03)**: User-authorized target remains 100% of instrumented lines/statements/functions/branches. Latest complete disposable PostgreSQL/PostGIS run: 917/917 cases, 73 suites, no skips; coverage 60.63% lines, 58.76% statements, 47.50% functions, 52.19% branches. Authentication, financial concurrency/reporting, privacy, inventory/pickup timezone and browser lifecycle repairs have regression coverage. Types/lint pass and dependency audit is zero. Production build passes and browser acceptance passed 95/95; both focused listing-publication cases pass after the final clock-comparison fix. Substantial coverage gaps remain. See [TEST_COVERAGE_AUDIT.md](../TEST_COVERAGE_AUDIT.md). Historical completed checkpoints below do not constitute a current release sign-off.

- [x] **CP-11.1**: Execute comprehensive security and authorization boundary audit.
- [x] **CP-11.2**: Audit payment gateway failover, webhook idempotency, and amount validation.
- [x] **CP-11.3**: Perform database query tuning (`EXPLAIN ANALYZE`) and connection pool optimization.
- [x] **CP-11.4**: Configure structured logging, health checks, and error tracking.
- [x] **CP-11.5**: Author multi-stage production `Dockerfile` and container orchestration.
- [x] **CP-11.6**: Implement automated database backup script and execute restore verification.
- [x] **CP-11.7**: Conduct final legal and food safety audit against registries.
- [x] **CP-11.8**: Final sign-off and transition project status to `Production Ready`.

---

# Definition of Done

* All 11 checkpoints completed and verified.
* Zero critical security, financial, or data integrity vulnerabilities.
* System is fully deployable and operational in production.
* `docs/PROJECT_STATUS.md` reflects `Production Ready`.

---

# Documentation Updates

* Update `docs/PROJECT_STATUS.md` with final production audit report and sign-off.
