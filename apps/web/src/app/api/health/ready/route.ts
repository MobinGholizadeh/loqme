import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Readiness Probe (/api/health/ready)
 * Verifies that the server and backing services (PostgreSQL/PostGIS) are ready to serve requests.
 */
export async function GET() {
  const dbHealth = await checkDatabaseHealth();

  const isReady = dbHealth.healthy;
  const statusCode = isReady ? 200 : 503;

  return NextResponse.json(
    {
      status: isReady ? 'ready' : 'unhealthy',
      service: 'loqme-web',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbHealth.healthy ? 'connected' : 'disconnected',
          latencyMs: dbHealth.latencyMs,
          error: dbHealth.error,
        },
      },
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
