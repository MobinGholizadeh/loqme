import { aroundAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { withDatabaseActor } from '@/lib/db/context';

/**
 * Legacy business-rule suites create arbitrary fixtures and test domain authorization
 * independently of RLS. Give them an explicit application ADMIN identity, while still
 * using the restricted runtime connection. Request wrappers override it with real JWTs.
 * rls.integration.test.ts intentionally does NOT install this harness.
 */
export function useDatabaseAdmin() {
  aroundAll(async runSuite => {
    const url = process.env.DATABASE_MIGRATION_URL;
    if (!url || !new URL(url).pathname.startsWith('/loqme_onboarding_test_') ||
      !process.env.DATABASE_URL || new URL(url).pathname !== new URL(process.env.DATABASE_URL).pathname) {
      throw new Error('Disposable admin and runtime database URLs required for fixture setup');
    }
    const seed = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    try {
      const actor = await seed.user.create({ data: { mobile: `rls-test-harness-${randomUUID()}`, role: 'ADMIN' } });
      await withDatabaseActor(actor.id, runSuite);
      await seed.user.delete({ where: { id: actor.id } });
    } finally { await seed.$disconnect(); }
  });
}
