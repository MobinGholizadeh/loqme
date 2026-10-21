import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { withDatabaseActor } from './context';

/** Both cookie and bearer clients use the verified identity; PostgreSQL resolves live roles. */
// Route signatures vary (including no-argument health routes); preserve the original signature.
export function withDatabaseRequest<T extends (...args: any[]) => any>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    const request = args[0];
    const token = request?.headers ? extractSessionToken(request) : null;
    const session = token ? await verifySessionToken(token) : null;
    return withDatabaseActor(session?.userId, () => handler(...args));
  }) as T;
}
