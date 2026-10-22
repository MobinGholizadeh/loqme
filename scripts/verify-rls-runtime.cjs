/** Read-only deployment acceptance through the actual restricted runtime connection. */
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { Prisma } = require('@prisma/client');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const { rows: [role] } = await client.query(`SELECT current_user AS name,
      NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication
      AND pg_has_role(current_user,'loqme_app','MEMBER')
      AND NOT pg_has_role(current_user,'loqme_rls_reader','MEMBER')
      AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','loqme_rls') AND pg_has_role(current_user,c.relowner,'MEMBER')) AS safe
      FROM pg_roles r WHERE r.rolname=current_user`);
    if (!role?.safe) throw new Error('Unsafe runtime database role');
    const models = Prisma.dmmf.datamodel.models.map(model => model.dbName || model.name);
    const { rows: tables } = await client.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND c.relrowsecurity AND c.relforcerowsecurity`, [models]);
    if (tables.length !== models.length) throw new Error('Missing ENABLE/FORCE RLS on an application table');
    for (const table of ['User', 'Customer', 'Order', 'Payment', 'FinancialTransaction', 'Session', 'OtpCode']) {
      const { rowCount } = await client.query('SELECT 1 FROM "'+table+'" LIMIT 1');
      if (rowCount) throw new Error('Private rows are visible without an actor');
    }
    await client.query('SELECT 1 FROM "Category" LIMIT 1');
    await client.query('COMMIT');
    console.log(JSON.stringify({ runtimeRole: role.name, enforcedTables: tables.length, anonymousPrivateAccess: false }));
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error('Runtime RLS verification failed; no credentials or private rows are logged');
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
