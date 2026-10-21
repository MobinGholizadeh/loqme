import { AsyncLocalStorage } from 'node:async_hooks';

/** Server-owned identity. Never populate this from request body/header role claims. */
export type DatabaseContext = Readonly<{
  userId?: string;
  service?: 'auth' | 'payment' | 'expiry' | 'reservation' | 'review' | 'safety' | 'invite';
  scope?: string;
  subject?: string;
}>;

const contexts = new AsyncLocalStorage<DatabaseContext>();
export const databaseContext = (): DatabaseContext => contexts.getStore() ?? {};

export function withDatabaseActor<T>(userId: string | undefined, work: () => T): T {
  return contexts.run(Object.freeze({ userId }), work);
}

/** Narrow, explicit backend operations; these do not grant a database bypass role. */
export function withDatabaseService<T>(
  service: NonNullable<DatabaseContext['service']>, scope: string, work: () => T, subject?: string,
): T {
  return contexts.run(Object.freeze({ userId: databaseContext().userId, service, scope, subject }), work);
}

export function withReservationWrite<T>(scope: string, work: () => T): T {
  return databaseContext().service === 'expiry' ? work() : withDatabaseService('reservation', scope, work);
}
