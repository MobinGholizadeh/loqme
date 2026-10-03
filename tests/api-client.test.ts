import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient, LoqmeApiError } from '@loqme/api';

describe('Universal API transport', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset().mockResolvedValue(Response.json({ success: true })); });
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes base URLs and sends JSON and asynchronous bearer credentials', async () => {
    const client = createApiClient({ baseUrl: 'https://example.test/', getAuthToken: async () => 'signed-token' });
    await expect(client.raw('resource', { method: 'POST', body: '{}' })).resolves.toEqual({ success: true });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.test/resource');
    expect(options.headers.get('authorization')).toBe('Bearer signed-token');
    expect(options.headers.get('content-type')).toBe('application/json');
    expect(options.body).toBe('{}');
  });

  it('preserves explicit headers and does not overwrite multipart boundaries', async () => {
    const client = createApiClient({ getAuthToken: () => 'other' });
    const body = new FormData(); body.set('file', 'sample');
    await client.raw('/upload', { body });
    expect(fetchMock.mock.calls[0][1].headers.has('content-type')).toBe(false);
    await client.raw('/upload', { headers: { Authorization: 'Bearer chosen', 'Content-Type': 'text/plain' } });
    expect(fetchMock.mock.calls[1][1].headers.get('authorization')).toBe('Bearer chosen');
    expect(fetchMock.mock.calls[1][1].headers.get('content-type')).toBe('text/plain');
  });

  it('supports absent credentials and default server/browser origins', async () => {
    await createApiClient({ getAuthToken: () => null }).raw('/public');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/public');
    expect(fetchMock.mock.calls[0][1].headers.has('authorization')).toBe(false);
    vi.stubGlobal('window', {});
    await createApiClient().raw('/public');
    expect(fetchMock.mock.calls[1][0]).toBe('/public');
  });

  it('preserves structured errors and invokes unauthorized handling only for 401', async () => {
    const onUnauthorized = vi.fn(); const client = createApiClient({ onUnauthorized });
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Denied', code: 'SESSION', details: { mobile: ['invalid'] } }, { status: 401 }));
    await expect(client.raw('/private')).rejects.toMatchObject({ name: 'LoqmeApiError', message: 'Denied', status: 401, code: 'SESSION', details: { mobile: ['invalid'] } });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    fetchMock.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));
    await expect(client.raw('/private')).rejects.toMatchObject({ status: 503, message: 'خطای سرور (503)' });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    await expect(createApiClient().raw('/private')).rejects.toBeInstanceOf(LoqmeApiError);
    expect(new LoqmeApiError('failure').status).toBe(500);
  });

  it('handles empty success bodies and propagates network errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(createApiClient().raw('/empty')).resolves.toBeNull();
    const error = new TypeError('Network unavailable'); fetchMock.mockRejectedValueOnce(error);
    await expect(createApiClient().raw('/offline')).rejects.toBe(error);
  });

  it('routes auth operations with encoded query values and correct methods', async () => {
    const { auth } = createApiClient();
    await auth.requestOtp({ mobile: '09121111111' });
    await auth.verifyOtp({ mobile: '09121111111', code: '12345' });
    await auth.getSession(); await auth.logout(); await auth.getDevOtp('+98912&x=1');
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).pathname)).toEqual(['/api/auth/request-otp', '/api/auth/verify-otp', '/api/auth/session', '/api/auth/logout', '/api/auth/dev-otp']);
    expect(fetchMock.mock.calls.map(([, init]) => init.method)).toEqual(['POST', 'POST', 'GET', 'POST', 'GET']);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ mobile: '09121111111', code: '12345' });
    expect(new URL(fetchMock.mock.calls[4][0]).searchParams.get('mobile')).toBe('+98912&x=1');
  });

  it('routes business operations, preserves cancellation and avoids stale application reads', async () => {
    const { business } = createApiClient(); const signal = new AbortController().signal;
    await business.cities(); await business.searchPlaces('کافه & نان', 'city/1', signal); await business.reversePlace(37.5, 45, signal);
    await business.application(); await business.submit({ businessNameFa: 'کافه' } as never);
    await business.applications(); await business.applications(3); await business.review('id/with space', { decision: 'REJECTED', reasonFa: 'مدارک ناقص', expectedRevision: 1 });
    expect(fetchMock.mock.calls[0][0]).toContain('/api/business/cities');
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('q')).toBe('کافه & نان');
    expect(fetchMock.mock.calls[1][1].signal).toBe(signal);
    expect(new URL(fetchMock.mock.calls[2][0]).searchParams.get('latitude')).toBe('37.5');
    expect(fetchMock.mock.calls[2][1].signal).toBe(signal);
    expect(fetchMock.mock.calls[3][1].cache).toBe('no-store');
    expect(fetchMock.mock.calls[4][1].method).toBe('POST');
    expect(fetchMock.mock.calls[5][0]).toContain('?page=1');
    expect(fetchMock.mock.calls[6][0]).toContain('?page=3');
    expect(fetchMock.mock.calls[7][0]).toContain('/id%2Fwith%20space');
    expect(fetchMock.mock.calls[7][1].method).toBe('PATCH');
  });
});
