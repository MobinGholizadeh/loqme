/** Run only as a deployment/migration step. Never load administrative credentials in the web process. */
require('dotenv').config({ quiet: true });
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_MIGRATION_URL;
  const password = process.env.DATABASE_RUNTIME_PASSWORD;
  if (!connectionString || !password || password.length < 24) {
    throw new Error('DATABASE_MIGRATION_URL and a DATABASE_RUNTIME_PASSWORD of at least 24 characters are required');
  }
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query('BEGIN');
    const existing = await client.query("SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolreplication FROM pg_roles WHERE rolname='loqme_runtime'");
    if (existing.rows.some(row => Object.values(row).some(Boolean))) throw new Error('Refusing to reuse an elevated loqme_runtime role');
    // PostgreSQL role DDL does not accept bind parameters. Quote only this secret literal;
    // do not print SQL, URLs, credentials, or driver errors (which can contain SQL).
    const literal = "'" + password.replaceAll("'", "''") + "'";
    if (!existing.rowCount) await client.query('CREATE ROLE loqme_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
    await client.query(`ALTER ROLE loqme_runtime PASSWORD ${literal}`);
    await client.query('GRANT loqme_app TO loqme_runtime');
    const unsafe = await client.query(`SELECT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','loqme_rls') AND pg_has_role('loqme_runtime',c.relowner,'MEMBER')
    ) OR pg_has_role('loqme_runtime','loqme_rls_reader','MEMBER') AS unsafe`);
    if (unsafe.rows[0].unsafe) throw new Error('Runtime role owns objects or inherits the policy-reader role');
    await client.query('COMMIT');
    console.log('Restricted loqme_runtime role provisioned. Configure DATABASE_URL with its credentials.');
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error('RLS runtime provisioning failed; no credentials or database error details are logged');
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
