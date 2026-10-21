import { withDatabaseRequest } from '@/lib/db/request';
import { NextResponse } from 'next/server';
import * as net from 'net';
import { checkDatabaseHealth } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Checks Redis responsiveness using raw RESP protocol ping over TCP socket
 */
async function checkRedisHealth(timeoutMs = 1500): Promise<{
  healthy: boolean;
  latencyMs: number;
  status: 'connected' | 'disconnected' | 'unconfigured';
  error?: string;
}> {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  // If no Redis endpoint is configured in current environment, mark as unconfigured
  if (!redisUrl && !redisHost) {
    return {
      healthy: true,
      latencyMs: 0,
      status: 'unconfigured',
    };
  }

  const start = Date.now();

  return new Promise((resolve) => {
    try {
      let host = redisHost || '127.0.0.1';
      let port = parseInt(process.env.REDIS_PORT || '6379', 10);

      if (redisUrl) {
        try {
          const parsed = new URL(redisUrl);
          host = parsed.hostname;
          port = parseInt(parsed.port || '6379', 10);
        } catch {
          // Fallback if URL parsing fails
        }
      }

      const socket = net.createConnection({ host, port }, () => {
        socket.write('PING\r\n');
      });

      let finished = false;
      socket.setTimeout(timeoutMs);

      socket.on('data', (chunk) => {
        if (finished) return;
        finished = true;
        const latencyMs = Date.now() - start;
        socket.destroy();

        if (chunk.toString().includes('PONG')) {
          resolve({
            healthy: true,
            latencyMs,
            status: 'connected',
          });
        } else {
          resolve({
            healthy: false,
            latencyMs,
            status: 'disconnected',
            error: `Unexpected Redis response: ${chunk.toString().trim()}`,
          });
        }
      });

      socket.on('timeout', () => {
        if (finished) return;
        finished = true;
        socket.destroy();
        resolve({
          healthy: false,
          latencyMs: Date.now() - start,
          status: 'disconnected',
          error: `Redis connection timed out after ${timeoutMs}ms`,
        });
      });

      socket.on('error', (err) => {
        if (finished) return;
        finished = true;
        socket.destroy();
        resolve({
          healthy: false,
          latencyMs: Date.now() - start,
          status: 'disconnected',
          error: err.message || 'Redis connection error',
        });
      });
    } catch (err: any) {
      resolve({
        healthy: false,
        latencyMs: Date.now() - start,
        status: 'disconnected',
        error: err?.message || 'Redis socket initialization failed',
      });
    }
  });
}

/**
 * Production Health Check Endpoint (/api/health)
 * Evaluates PostgreSQL database connectivity, Redis ping roundtrip latency,
 * process uptime, and memory usage.
 */
async function handleGET() {
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  const uptimeSeconds = Math.floor(
    typeof process.uptime === 'function' ? process.uptime() : 0
  );
  const memoryUsage =
    typeof process.memoryUsage === 'function' ? process.memoryUsage() : null;

  // Service is considered healthy if database is healthy and Redis (if configured) is healthy
  const isHealthy = dbHealth.healthy && redisHealth.healthy;
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'loqme-web',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      environment: process.env.NODE_ENV || 'production',
      nodeVersion: process.version,
      checks: {
        database: {
          status: dbHealth.healthy ? 'connected' : 'disconnected',
          latencyMs: dbHealth.latencyMs,
          error: dbHealth.error,
        },
        redis: {
          status: redisHealth.status,
          healthy: redisHealth.healthy,
          latencyMs: redisHealth.latencyMs,
          error: redisHealth.error,
        },
      },
      memory: memoryUsage
        ? {
            rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
            heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            externalMb: Math.round(memoryUsage.external / 1024 / 1024),
          }
        : null,
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export const GET = withDatabaseRequest(handleGET);
