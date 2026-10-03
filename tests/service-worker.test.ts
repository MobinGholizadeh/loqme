import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Service worker privacy and offline behavior', () => {
  let handlers: Record<string, (event: any) => void>;
  const cache = { addAll: vi.fn(), match: vi.fn(), put: vi.fn() };
  const storage = { open: vi.fn(), match: vi.fn(), keys: vi.fn(), delete: vi.fn() };
  const fetchMock = vi.fn(); const skipWaiting = vi.fn(); const claim = vi.fn();
  beforeEach(async () => {
    vi.resetAllMocks(); vi.resetModules(); handlers = {};
    storage.open.mockResolvedValue(cache); storage.match.mockResolvedValue(undefined); cache.addAll.mockResolvedValue(undefined); cache.put.mockResolvedValue(undefined);
    vi.stubGlobal('self', { location: { origin: 'https://loqme.test' }, clients: { claim }, skipWaiting, addEventListener: (type: string, fn: any) => { handlers[type] = fn; } });
    vi.stubGlobal('caches', storage); vi.stubGlobal('fetch', fetchMock);
    await import('../apps/web/public/sw.js');
  });
  afterEach(() => vi.unstubAllGlobals());
  function event(path = '/logo.png', values = {}) {
    return { request: { url: `https://loqme.test${path}`, method: 'GET', headers: new Headers(), mode: 'cors', destination: '', ...values }, respondWith: vi.fn(), waitUntil: vi.fn() };
  }
  async function response(input: ReturnType<typeof event>) { handlers.fetch(input); expect(input.respondWith).toHaveBeenCalledOnce(); return await input.respondWith.mock.calls[0][0]; }
  it('precaches only same-origin Next assets from the offline document', async () => {
    cache.match.mockResolvedValue(new Response('<script src="/_next/static/a.js"></script><link href="/_next/static/a.css"><script src="https://evil.test/_next/static/evil.js"></script><a href="/orders">Private</a>'));
    const input = event(); handlers.install(input); await input.waitUntil.mock.calls[0][0];
    expect(cache.addAll).toHaveBeenNthCalledWith(1, ['/offline', '/favicon.svg', '/logo.png', '/icon.svg']);
    expect(cache.addAll).toHaveBeenNthCalledWith(2, ['https://loqme.test/_next/static/a.js', 'https://loqme.test/_next/static/a.css']); expect(skipWaiting).toHaveBeenCalledOnce();
  });
  it('removes only outdated Loqme caches', async () => {
    storage.keys.mockResolvedValue(['loqme-cache-v1', 'loqme-cache-v4', 'another-app']);
    const input = event(); handlers.activate(input); await input.waitUntil.mock.calls[0][0];
    expect(storage.delete).toHaveBeenCalledExactlyOnceWith('loqme-cache-v1'); expect(claim).toHaveBeenCalledOnce();
  });
  it.each(['/orders/1', '/profile', '/login', '/business', '/api/session', '/admin', '/merchant', '/checkout'])('never intercepts private path %s', path => {
    const input = event(path, { mode: 'navigate' }); handlers.fetch(input); expect(input.respondWith).not.toHaveBeenCalled();
  });
  it.each([{ method: 'POST' }, { url: 'https://external.test/image' }, { headers: new Headers({ Authorization: 'Bearer token' }) }])('bypasses unsafe request %j', values => {
    const input = event('/resource', values); handlers.fetch(input); expect(input.respondWith).not.toHaveBeenCalled();
  });
  it('uses network navigation and falls back to the offline page on a network failure', async () => {
    const live = new Response('live'); fetchMock.mockResolvedValueOnce(live);
    expect(await response(event('/', { mode: 'navigate' }))).toBe(live);
    const offline = new Response('offline'); fetchMock.mockRejectedValueOnce(new Error('offline')); storage.match.mockResolvedValue(offline);
    expect(await response(event('/', { mode: 'navigate' }))).toBe(offline); expect(storage.match).toHaveBeenCalledWith('/offline');
  });
  it.each([200, 404])('refreshes CSS online but caches only successful responses (%s)', async status => {
    const css = new Response('styles', { status }); fetchMock.mockResolvedValue(css);
    const input = event('/style.css', { destination: 'style' }); expect(await response(input)).toBe(css);
    expect(cache.put).toHaveBeenCalledTimes(status === 200 ? 1 : 0);
  });
  it('uses cached CSS offline or preserves the fetch error when no copy exists', async () => {
    const failure = new Error('offline'); fetchMock.mockRejectedValue(failure); const cached = new Response('cached');
    cache.match.mockResolvedValueOnce(cached).mockResolvedValueOnce(undefined);
    expect(await response(event('/style.css', { destination: 'style' }))).toBe(cached);
    await expect(response(event('/missing.css', { destination: 'style' }))).rejects.toBe(failure);
  });
  it.each(['script', 'image', 'font'])('serves cached %s without fetching', async destination => {
    const cached = new Response('cached'); storage.match.mockResolvedValue(cached);
    expect(await response(event('/asset', { destination }))).toBe(cached); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{ status: 200, type: 'basic', store: true }, { status: 404, type: 'basic', store: false }, { status: 200, type: 'opaque', store: false }, null])('caches only valid same-origin static responses: %j', async value => {
    const clone = new Response('asset'); const network = value ? { ...value, clone: () => clone } : null;
    fetchMock.mockResolvedValue(network);
    expect(await response(event('/asset', { destination: 'image' }))).toBe(network);
    await Promise.resolve(); expect(cache.put).toHaveBeenCalledTimes(value?.store ? 1 : 0);
  });
  it('leaves other resource types to the browser', () => {
    const input = event('/clip', { destination: 'video' }); handlers.fetch(input); expect(input.respondWith).not.toHaveBeenCalled();
  });
});
