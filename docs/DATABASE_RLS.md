# Database row-level security

Owner-authorized CP-12.6, implemented and tested on 2026-10-22. The owner subsequently authorized local activation and live production rollout. Local activation is complete; production rollout is in progress. This supersedes earlier deferral of RLS in the merchant-data plan.

## Coverage and authority

`prisma/migrations/20261021010000_row_level_security/migration.sql` enables and forces PostgreSQL RLS on all 34 current Prisma model tables. `_prisma_migrations` and PostGIS metadata are not application tables and are not granted to the runtime role. New tables require an explicit migration with policies and grants before application use.

The application connects as `loqme_runtime`, a non-owner login without superuser, role-creation, database-creation, replication or RLS-bypass privileges. It assumes the non-login `loqme_app` role only inside each transaction. The runtime client rejects administrative/owner connections. It supplies parameterized transaction-local settings for a verified user ID and any trusted service scope, then automatically clears them on commit or rollback. Standalone model queries and raw SQL also go through this transaction wrapper; explicit transactions preserve their isolation settings. Array-style Prisma transactions are deliberately unsupported; use interactive transactions.

Signed cookie/Bearer tokens supply identity only. Policy helpers read the active user's **current** role, merchant ownership, staff membership and pickup permission from PostgreSQL. Role claims in tokens cannot grant authority. Disabled users and removed/demoted staff lose their corresponding access without waiting for token expiry.

| Actor | Allowed scope |
| --- | --- |
| Guest | Reference geography/categories, approved merchant catalog, published or sold-out safety-approved listings, public reviews and a limited reviewer-name/listing-title projection. No private customer/order/payment/session/OTP rows. |
| Customer | Own profile, favorites, application, reservations, orders and related payment/refund records; own reviews/complaints. Existing backend flows control writes and state transitions. |
| Merchant owner | Own merchant settings, staff and listings, operational orders, own merchant financial records and reports. Cannot approve the merchant, set commission or reassign ownership through ordinary writes. |
| Staff manager | Assigned merchant listing management and operational records. No merchant payment/ledger/refund/report access through staff membership. |
| Staff cashier | Assigned merchant pickup operations when `canScanPickup` is enabled. No listing/stock management or merchant payment/ledger/refund access. |
| Admin | Current active application administrators retain oversight and moderation. Append-only financial/event/history/audit records remain append-only even for application admins. |

Staff membership roles are `OWNER`, `MANAGER`, `CASHIER`; account types remain `CUSTOMER`, `MERCHANT_OWNER`, `MERCHANT_STAFF`, `ADMIN`. A merchant account can also retain its own customer profile; own-customer access does not grant access to other customers or merchants. An owner membership grants owner scope for its assigned merchant.

RLS is a **row** boundary. Permitted rows can contain fields that must still be omitted from HTTP responses. For example, merchant pickup needs scoped customer/order records, while existing DTOs determine which contact and order fields the client receives. Public review display uses a fixed read-only projection instead of granting public access to private customer/order tables. Do not expose a generic SQL/Prisma API or promise column-level confidentiality from these policies.

## Trusted service operations

`apps/web/src/lib/db/context.ts` is server infrastructure, never a client input contract:

| Service | Scope and purpose |
| --- | --- |
| `auth` | One normalized phone number for OTP lookup, consumption and customer registration. |
| `payment` | One provider authority and its associated order for callback completion, inventory conversion, ledger and savings. |
| `reservation` | One listing or the actor's reservation for inventory hold, checkout and cancellation. |
| `expiry` | One listing, or the explicitly requested global expired-reservation sweep. |
| `invite` | Owner-authorized merchant and one normalized invitee phone number. |
| `review` | One merchant's rating aggregate during review submission. |
| `safety` | One merchant's complaint counting and automated safety lockout. |

Auth/payment/expiry scopes clear any inherited user identity so an attached admin cookie cannot widen these operations. Other scopes retain identity for ownership checks. Payment verification and all financial/stateful business validation remain authoritative backend responsibilities; possessing a callback URL alone does not approve payment. SQL write guards additionally prevent non-admin role escalation, parent/ownership reassignment, forged payment state, unrestricted savings changes and prohibited safety resets.

The `loqme_rls_reader` role is **NOLOGIN** and has BYPASSRLS plus SELECT privileges. It owns only fixed read-only policy helpers/projections and four existing read-only financial/pickup integrity checks. This avoids recursive policies and lets integrity checks inspect hidden financial rows without granting cashiers access. Functions have fixed search paths; public execution is revoked. Never grant runtime membership in this role or add a generic query/write helper owned by it.

The trust boundary is the authenticated backend, not arbitrary database clients. Custom PostgreSQL settings are not cryptographic credentials: someone with runtime SQL execution/credentials could forge them. RLS protects against missing tenant filters and accidental cross-role queries; it does not defend against compromised backend credentials, arbitrary SQL injection or a PostgreSQL administrator. Keep credentials server-side, keep SQL parameterized and retain HTTP authorization/strict DTOs. Future scheduled jobs must explicitly select their narrow service scope; do not add a blanket background-worker bypass.

## Local setup

Use `.env.example` and supply matching connections to the same database:

- `DATABASE_MIGRATION_URL`: administrative connection for migrations, provisioning and development seed only. This migration requires authority to create the NOLOGIN BYPASSRLS helper role and transfer function ownership (the project's PostgreSQL administrator can do this).
- `DATABASE_RUNTIME_PASSWORD`: random URL-safe password of at least 24 characters, using only letters, digits, `_` and `-`; no placeholder values.
- `DATABASE_URL`: `loqme_runtime` connection using that password. Never put the administrative connection here.

Start the database, install dependencies and generate Prisma, then run:

```sh
npm run db:migrate:deploy
npm run db:provision-runtime
# Development fixtures only, never seed production:
npm run db:seed
npm run dev
```

The provisioning command creates/updates the fixed restricted login and grants `loqme_app`; it refuses elevated or object-owning existing runtime accounts. Re-running it updates the login password, so do not rotate a shared runtime password while application instances still use the old one. PostgreSQL roles are cluster-wide, not database-local. Use separate database clusters for separate environments.

Production Compose injects the administrative URL only into the one-shot `migrate` service. The web service receives only the restricted connection. For local development the root `.env` may hold both; do not copy that file into a production web container. Do not use `prisma db push` as an RLS deployment mechanism: the Prisma schema does not represent the SQL policies/functions/triggers.

## Production rollout and recovery

The deployment prepares a missing `DATABASE_RUNTIME_PASSWORD` automatically in the existing server-managed `/opt/loqme/.env`, using a cryptographically random URL-safe password and atomic mode-0600 replacement. Existing valid passwords are retained; invalid/duplicate values fail before maintenance. Passwords are never printed. Deployment preserves database-owned values when refreshing Doppler secrets. The existing administrator password must continue to match the initialized PostgreSQL volume. `scripts/test-rls-env.py` covers creation, preservation, rejection and missing-file handling.

The updated workflow validates on disposable PostgreSQL, pulls the matching image, pauses application writes, takes and checks a custom-format backup, restores it into a separate temporary database, runs the migration and provisioning container, verifies all model-table RLS and anonymous denial using actual runtime credentials, then starts the application and checks readiness. A successful restore-check database is removed; a failed rehearsal remains for investigation. Ensure any separate job runners/writers are paused too. Allow a maintenance window: this is an authority change with table DDL locks. Production workload/performance acceptance remains an operational gate.

Manual equivalent after those prerequisites and backup:

```sh
docker compose -f docker-compose.prod.yml --profile migrations run --rm --no-deps migrate
docker compose -f docker-compose.prod.yml up -d --no-deps app
```

The migration is transactional. A failure after the write pause leaves the app stopped for operator repair; do not reconnect it as administrator to bypass the failure. The first RLS release cannot automatically roll back to an old image without context support. The workflow checks the `shop.loqme.database-rls=1` image label before attempting application rollback. The label is a compatibility floor, not proof of compatibility with every future migration.

Prefer a forward repair. If a database restore is necessary, retain the failed database for investigation, restore the verified backup to a separate controlled target, validate data and roles, and select a compatible application/configuration before switching traffic. Do not automatically disable RLS or drop roles. A restore after traffic resumes also requires reconciling any payments/writes accepted since the backup; never silently discard them. Cluster roles are not included in `pg_dump` database backups and need their own recovery plan.

## Verification

`node scripts/verify-rls-runtime.cjs` performs read-only checks using `DATABASE_URL`: safe role/membership/ownership, ENABLE/FORCE on every generated model, no anonymous private rows, and public category access. It logs no private data or credentials and is executed by CI and production deployment.

Local activation (2026-10-22): existing `loqme` data backed up under ignored `.artifacts/rls/local-before-activation`, backup restored into a separate review database, migration rehearsed there and then applied to `loqme`. All 34 model row counts were preserved. Root/web local environment files now use `loqme_runtime`; the root migration URL remains separate. The development server was restarted and readiness/public/protected endpoint checks passed. Never commit the ignored backup or recovery environment files.

Run these read-only checks on the target after migration:

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p')
  AND c.relname NOT IN ('_prisma_migrations','spatial_ref_sys')
ORDER BY c.relname;
-- All 34 application tables must show true / true.

SELECT rolname, rolcanlogin, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolreplication
FROM pg_roles WHERE rolname IN ('loqme_runtime','loqme_app','loqme_rls_reader');
-- Only runtime can log in; only the NOLOGIN reader bypasses RLS.

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies WHERE schemaname='public' ORDER BY tablename, cmd;
```

`tests/rls.integration.test.ts` requires explicit administrative and restricted URLs targeting the same disposable `loqme_onboarding_test_*` database. It uses real PostgreSQL policies and authenticated request bindings, without Prisma/auth mocks. It covers all-table enforcement, unsafe connection rejection, cross-customer/merchant reads and writes, manager/cashier/owner/admin distinctions, revocation, append-only records, concurrent context isolation/rollback, forbidden TRUNCATE/helper-role escalation, forged role claims, actual routes, OTP/onboarding/invitations, reservation concurrency, checkout/callback replay, pickup/reviews, safety lockout and reports.

Legacy database fixture suites use an explicit application-admin actor; this still uses the restricted login and enforced RLS. They establish business regression coverage, not cross-user isolation evidence. The dedicated RLS suite does not use that harness.

2026-10-22 verification: a fresh disposable PostgreSQL 15/PostGIS container accepted all **16 migrations** and seed data. The complete suite passed **1,010 tests in 82 files**, including **20 RLS acceptance tests**, with no failures/skips. Workspace typecheck, zero-warning lint, Prisma validation, production build, Compose configuration checks and 11 deployment/Android policy tests passed. Logs are ignored local artifacts under `.artifacts/rls/`. Production performance, live providers, physical devices and the existing global coverage/release gates are not certified by this run.
