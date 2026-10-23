import { Prisma, type PrismaClient } from '@prisma/client';
import { databaseContext } from './context';

type TransactionOptions = { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel };

/**
 * Every query (including raw SQL) and interactive transaction receives transaction-local
 * context. No request-wide transaction: network/provider calls must not hold DB locks.
 * The underlying client is deliberately not exported from the application singleton.
 */
export function createRlsClient(base: PrismaClient): PrismaClient {
  let verified: Promise<void> | undefined;
  async function verifyRuntime() {
    verified ??= (async () => {
      const [role] = await base.$queryRaw<{ safe: boolean }[]>`
        SELECT NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication
          AND pg_has_role(current_user, 'loqme_app', 'MEMBER')
          AND NOT pg_has_role(current_user, 'loqme_rls_reader', 'MEMBER')
          AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relkind IN ('r','p') AND pg_has_role(current_user,c.relowner,'MEMBER')) AS safe
        FROM pg_roles r WHERE r.rolname=current_user`;
      if (!role?.safe) throw new Error('DATABASE_URL must use a non-owner, non-superuser, NOBYPASSRLS member of loqme_app. Use DATABASE_MIGRATION_URL only for migrations.');
    })();
    try { await verified; } catch (error) { verified = undefined; throw error; }
  }

  async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>, options?: TransactionOptions): Promise<T> {
    if (typeof work !== 'function') throw new Error('RLS requires interactive transactions; array transactions are unsupported.');
    const context = databaseContext();
    await verifyRuntime();
    return base.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE loqme_app');
      await tx.$queryRaw`SELECT set_config('loqme.user_id', ${context.userId ?? ''}, true),
        set_config('loqme.service', ${context.service ?? ''}, true),
        set_config('loqme.scope', ${context.scope ?? ''}, true),
        set_config('loqme.subject', ${context.subject ?? ''}, true),
        set_config('loqme.actor_id', ${context.userId ?? ''}, true),
        set_config('loqme.reason_code', '', true)`;
      return work(tx);
    }, options);
  }

  // A closed facade prevents escaping to the unscoped base client. It also preserves
  // ordinary method descriptors for instrumentation and existing unit-test spies.
  const facade: Record<string, any> = {
    $transaction: transaction,
    $disconnect: () => base.$disconnect(),
    $connect: () => base.$connect(),
  };
  for (const operation of ['$queryRaw', '$executeRaw', '$queryRawUnsafe', '$executeRawUnsafe']) {
    facade[operation] = (...args: any[]) => transaction(tx => (tx as any)[operation](...args));
  }
  const operations = ['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow',
    'findMany', 'create', 'createMany', 'createManyAndReturn', 'update', 'updateMany',
    'updateManyAndReturn', 'upsert', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'];
  for (const model of Prisma.dmmf.datamodel.models) {
    const name = model.name[0].toLowerCase() + model.name.slice(1);
    facade[name] = Object.fromEntries(operations.map(operation => [operation,
      (...args: any[]) => transaction(tx => (tx as any)[name][operation](...args)),
    ]));
  }
  return new Proxy(facade, {
    get(target, prop) {
      if (typeof prop === 'string' && !(prop in target) && !prop.startsWith('$')) {
        target[prop] = Object.fromEntries(operations.map(operation => [operation,
          (...args: any[]) => transaction(tx => (tx as any)[prop][operation](...args)),
        ]));
      }
      return target[prop as string];
    },
  }) as PrismaClient;
}
