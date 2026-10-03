import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkDatabaseHealth } = vi.hoisted(() => ({ checkDatabaseHealth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ checkDatabaseHealth }));
import { GET } from '@/app/api/health/ready/route';

describe('Readiness response contract', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns ready only when the database probe succeeds and prevents caching', async () => {
    checkDatabaseHealth.mockResolvedValue({ healthy: true, latencyMs: 4 });
    const response = await GET();
    expect(checkDatabaseHealth).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toMatchObject({
      status: 'ready', checks: { database: { status: 'connected', latencyMs: 4 } },
    });
  });

  it('returns unavailable when the database probe fails and prevents caching', async () => {
    checkDatabaseHealth.mockResolvedValue({ healthy: false, latencyMs: 20, error: 'Connection refused' });
    const response = await GET();
    expect(checkDatabaseHealth).toHaveBeenCalledOnce();
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toMatchObject({
      status: 'unhealthy',
      checks: { database: { status: 'disconnected', latencyMs: 20, error: 'Connection refused' } },
    });
  });
});
