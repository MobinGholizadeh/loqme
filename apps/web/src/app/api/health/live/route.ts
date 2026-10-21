import { withDatabaseRequest } from '@/lib/db/request';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness Probe (/api/health/live)
 * Verifies that the Next.js Node process is alive and accepting HTTP traffic.
 */
async function handleGET() {
  const uptimeSeconds = Math.floor(typeof process.uptime === 'function' ? process.uptime() : 0);
  const memoryUsage = typeof process.memoryUsage === 'function' ? process.memoryUsage() : null;

  return NextResponse.json(
    {
      status: 'ok',
      service: 'loqme-web',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      memoryUsage: memoryUsage
        ? {
            rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
            heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          }
        : null,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export const GET = withDatabaseRequest(handleGET);
