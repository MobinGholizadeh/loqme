import type { BusinessPlaceDto } from '@loqme/types';
import { BusinessError } from '@/domain/business/application.service';
import { readBoundedBody } from './bounded-body';

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
export function normalizeMapirPlaces(body: unknown): BusinessPlaceDto[] {
  const entries = record(body).value;
  if (!Array.isArray(entries)) throw new BusinessError(502, 'پاسخ جست‌وجوی نقشه نامعتبر است');
  return entries.flatMap((item, index) => {
    const value = record(item); const geom = record(value.geom);
    const coordinates = geom.coordinates;
    const name = text(value.title); const address = text(value.address);
    if (value.type !== 'point' || !name || !Array.isArray(coordinates)) return [];
    const [longitude, latitude] = coordinates;
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 24 || latitude > 40 || longitude < 44 || longitude > 64) return [];
    // Search v2 may have no provider ID. Never invent one or treat a list index as an ID.
    const providerId = text(value.id) || null;
    return [{ id: providerId || `result-${index}-${longitude}-${latitude}`, providerId, name, address, latitude, longitude }];
  }).slice(0, 10);
}
async function mapirRequest(path: string, body?: unknown) {
  const key = process.env.MAPIR_API_KEY;
  if (!key) throw new BusinessError(503, 'جست‌وجوی نقشه در دسترس نیست؛ اطلاعات فروشگاه را دستی وارد کنید');
  try {
    const response = await fetch(`https://map.ir/${path}`, {
      method: body ? 'POST' : 'GET', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000), cache: 'no-store',
    });
    if (!response.ok) throw new Error('Provider unavailable');
    const result = await readBoundedBody(response.body, 500000);
    return JSON.parse(result) as unknown;
  } catch { throw new BusinessError(503, 'ارتباط با نقشه برقرار نشد؛ دوباره تلاش کنید یا اطلاعات را دستی وارد کنید'); }
}
export async function searchMapir(query: string, city: string) {
  return normalizeMapirPlaces(await mapirRequest('search/v2', { text: `${query} ${city}` }));
}
export async function reverseMapir(latitude: number, longitude: number) {
  const result = record(await mapirRequest(`reverse?lat=${latitude}&lon=${longitude}`));
  return { address: text(result.address_compact) || text(result.address), city: text(result.city), province: text(result.province) };
}

// Bounded per-process counters; a global cap also prevents forged client IPs bypassing provider budgets.
const counters = new Map<string, { count: number; until: number }>();
export function limitMapir(client: string, now = Date.now()) {
  counters.forEach((entry, key) => { if (entry.until <= now) counters.delete(key); });
  for (const [key, limit] of [['global', 300], [`client:${client}`, 30]] as const) {
    const entry = counters.get(key) || { count: 0, until: now + 60000 };
    if (entry.count >= limit || counters.size >= 5000) throw new BusinessError(429, 'تعداد جست‌وجوها زیاد است؛ یک دقیقه دیگر تلاش کنید');
    entry.count++; counters.set(key, entry);
  }
}
