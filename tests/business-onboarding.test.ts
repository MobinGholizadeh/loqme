import { describe, it, expect, vi, afterEach } from 'vitest';
import { BusinessHoursSchema, MerchantApplicationSchema, safeLoginRedirect } from '@loqme/validation';
import { normalizeMapirPlaces, reverseMapir, searchMapir, limitMapir } from '@/lib/business/mapir';

const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: dayOfWeek < 6, storeOpenTime: '09:00', storeCloseTime: '21:00' }));
const application = { ownerName: 'مالک آزمایشی', businessNameFa: 'کافه آزمایشی', businessType: 'CAFE', cityId: 'city', addressFa: 'ارومیه خیابان دانشکده', latitude: 37.55, longitude: 45.07, hours };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('business onboarding contracts', () => {
  it('validates configured fields without accepting ownership, role, status or commission', () => {
    expect(MerchantApplicationSchema.safeParse(application).success).toBe(true);
    for (const field of ['ownerUserId', 'role', 'status', 'commissionPercent']) expect(MerchantApplicationSchema.safeParse({ ...application, [field]: 'injected' }).success).toBe(false);
  });
  it('requires all weekdays exactly once and valid same-day hours', () => {
    expect(BusinessHoursSchema.safeParse(hours.slice(1)).success).toBe(false);
    expect(BusinessHoursSchema.safeParse(hours.map(h => ({ ...h, dayOfWeek: 0 }))).success).toBe(false);
    for (const storeCloseTime of ['09:00', '08:00', '24:01', '17:90', '']) expect(BusinessHoursSchema.safeParse(hours.map(h => ({ ...h, storeCloseTime }))).success).toBe(false);
    expect(BusinessHoursSchema.safeParse(hours.map(h => ({ ...h, isOpen: false }))).success).toBe(false);
    expect(BusinessHoursSchema.safeParse(hours.map(h => h.dayOfWeek === 6 ? { ...h, storeOpenTime: '', storeCloseTime: '' } : h)).success).toBe(true);
  });
  it('rejects nonfinite and out-of-country map coordinates', () => {
    for (const latitude of [NaN, Infinity, 90, -90]) expect(MerchantApplicationSchema.safeParse({ ...application, latitude }).success).toBe(false);
  });
  it('only permits internal known login destinations', () => {
    expect(safeLoginRedirect('/checkout/hold?quantity=2')).toBe('/checkout/hold?quantity=2');
    expect(safeLoginRedirect('/merchant/orders')).toBe('/merchant/orders');
    for (const url of ['https://evil.example', '//evil.example', '/\\evil.example', '/%5cevil.example', 'javascript:alert(1)', '/%2fevil.example', '/login', '/unknown', '/merchant/../../login']) expect(safeLoginRedirect(url)).toBeNull();
  });
  it('normalizes actual Map.ir v2 point results, longitude first, without invented ID/hours', () => {
    const data = normalizeMapirPlaces({ value: [{ title: 'کافه', type: 'point', address: 'ارومیه', geom: { coordinates: [45.07, 37.55] } }, { title: 'خیابان', type: 'line', geom: { coordinates: [45.07, 37.55] } }, { title: 'خراب', type: 'point', geom: { coordinates: [0, 0] } }] });
    expect(data).toHaveLength(1); expect(data[0]).toMatchObject({ providerId: null, latitude: 37.55, longitude: 45.07 });
    expect(data[0]).not.toHaveProperty('hours');
    expect(() => normalizeMapirPlaces({ error: true })).toThrow();
  });
  it('caps search output', () => {
    expect(normalizeMapirPlaces({ value: Array.from({ length: 30 }, (_, i) => ({ id: String(i), title: 'کافه', type: 'point', geom: { coordinates: [45, 37] } })) })).toHaveLength(10);
  });
  it('maps provider failure into a useful manual-entry fallback without leaking secrets', async () => {
    vi.stubEnv('MAPIR_API_KEY', 'private-secret'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    await expect(searchMapir('کافه', 'ارومیه')).rejects.toThrow('دستی');
  });
  it('keeps Map.ir keys in request headers and supports reverse geocoding', async () => {
    vi.stubEnv('MAPIR_API_KEY', 'private-secret'); const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ address_compact: 'خیابان دانشکده', city: 'ارومیه' }))); vi.stubGlobal('fetch', fetcher);
    expect(await reverseMapir(37.55, 45.07)).toMatchObject({ address: 'خیابان دانشکده', city: 'ارومیه' });
    expect(fetcher.mock.calls[0][0]).not.toContain('private-secret');
    expect(fetcher.mock.calls[0][1].headers['x-api-key']).toBe('private-secret');
  });
  it('retains manual entry on missing keys, timeouts, or oversized responses', async () => {
    vi.stubEnv('MAPIR_API_KEY', '');
    await expect(searchMapir('کافه', 'ارومیه')).rejects.toThrow('دستی');
    vi.stubEnv('MAPIR_API_KEY', 'test-only');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timeout', 'TimeoutError')));
    await expect(searchMapir('کافه', 'ارومیه')).rejects.toThrow('دستی');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x'.repeat(500001))));
    await expect(searchMapir('کافه', 'ارومیه')).rejects.toThrow('دستی');
  });
  it('rate-limits bursts and permits a later retry', () => {
    const now = Date.now(); for (let i = 0; i < 30; i++) limitMapir('test-client', now);
    expect(() => limitMapir('test-client', now)).toThrow('دقیقه');
    expect(() => limitMapir('test-client', now + 60001)).not.toThrow();
  });
});
