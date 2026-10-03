import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, scrubSensitiveData } from '@/lib/logger';

describe('Structured logging', () => {
  beforeEach(() => { for (const level of ['debug', 'info', 'warn', 'error'] as const) vi.spyOn(console, level).mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  it.each([null, undefined, 1, 'public', false])('preserves primitive %s', value => { expect(scrubSensitiveData(value)).toBe(value); });
  it('deeply redacts nested arrays without mutating the input', () => {
    const data = { list: [{ accessToken: 'secret', nested: { password: 'secret', name: 'public', empty: null } }], APIKEY: 'hidden' };
    expect(scrubSensitiveData(data)).toEqual({ list: [{ accessToken: '[REDACTED]', nested: { password: '[REDACTED]', name: 'public', empty: null } }], APIKEY: '[REDACTED]' });
    expect(data.list[0].accessToken).toBe('secret');
  });
  it('writes each level as parseable JSON and extracts the correlation ID', () => {
    vi.stubEnv('NODE_ENV', 'test');
    for (const level of ['debug', 'info', 'warn'] as const) {
      const entry = logger[level]('event', { correlationId: 'request-1', otp: '12345' });
      expect(JSON.parse(vi.mocked(console[level]).mock.calls[0][0])).toEqual(entry);
      expect(entry).toMatchObject({ level, correlationId: 'request-1', context: { otp: '[REDACTED]' } });
      expect(entry.context).not.toHaveProperty('correlationId');
    }
    const error = Object.assign(new Error('failure'), { code: 'TEST_ERROR' });
    expect(logger.error('event', error, { orderId: '1' }).error).toMatchObject({ message: 'failure', stack: expect.any(String), code: 'TEST_ERROR' });
    expect(console.error).toHaveBeenCalledOnce();
  });
  it('suppresses debug output and stack traces in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    logger.debug('hidden'); expect(console.debug).not.toHaveBeenCalled();
    const entry = logger.warn('failed', undefined, new Error('failure'));
    expect(entry.error?.stack).toBeUndefined(); expect(console.warn).toHaveBeenCalledOnce();
    expect(logger.info('normal').context).toBeUndefined();
    expect(logger.error('no exception').error).toBeUndefined();
  });
});
