import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createRlsClient } from './db/rls-client';

if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/loqme?schema=public';
  const adapter = new PrismaPg({ connectionString });
  return createRlsClient(new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? (process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn'])
        : ['error'],
  }));
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Checks database connectivity and measures round-trip query latency
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    // Perform simple query to verify active connection
    await prisma.$queryRaw`SELECT 1`;
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: err.message || 'Database ping failed',
    };
  }
}

// Graceful connection cleanup on container shutdown signals
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  const shutdown = async (signal: string) => {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore errors on rapid termination
    }
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

