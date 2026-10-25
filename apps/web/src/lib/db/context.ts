import { AsyncLocalStorage } from 'node:async_hooks';

/** Server-owned identity. Never populate this from request body/header role claims. */
export type DatabaseContext = Readonly<{
  userId?: string;
  service?: 'auth' | 'payment' | 'expiry' | 'reservation' | 'review' | 'safety' | 'invite' | 'notification' | 'discount';
  scope?: string;
  subject?: string;
}>;

const globalForContext = globalThis as unknown as {
  __loqmeDatabaseContexts?: AsyncLocalStorage<DatabaseContext>;
};
const contexts = globalForContext.__loqmeDatabaseContexts ?? new AsyncLocalStorage<DatabaseContext>();
if (process.env.NODE_ENV !== 'production') {
  globalForContext.__loqmeDatabaseContexts = contexts;
}
export const databaseContext = (): DatabaseContext => contexts.getStore() ?? {};

export function withDatabaseActor<T>(userId: string | undefined, work: () => T): T {
  return contexts.run(Object.freeze({ userId }), work);
}

/** Narrow, explicit backend operations; these do not grant a database bypass role. */
export function withDatabaseService<T>(
  service: NonNullable<DatabaseContext['service']>, scope: string, work: () => T, subject?: string,
): T {
  const userId = ['auth', 'payment', 'expiry'].includes(service) ? undefined : databaseContext().userId;
  return contexts.run(Object.freeze({ userId, service, scope, subject }), work);
}

export function withReservationWrite<T>(scope: string, work: () => T): T {
  return databaseContext().service === 'expiry' ? work() : withDatabaseService('reservation', scope, work);
}
