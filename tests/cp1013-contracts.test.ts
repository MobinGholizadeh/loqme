import { describe, it, expect, vi } from 'vitest';
import { foodLabelFa } from '@/lib/utils/food-labels';
const cities = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma', () => ({ prisma: { city: { findMany: cities } } }));
import { GET } from '@/app/api/business/cities/route';

describe('CP10.13 display and onboarding contracts', () => {
  it('translates legacy codes and preserves Persian merchant descriptions', () => {
    expect(foodLabelFa('HALAL', 'dietary')).toBe('حلال');
    expect(foodLabelFa('vegetarian', 'dietary')).toBe('گیاه‌خواری');
    expect(foodLabelFa('DAIRY', 'allergen')).toBe('لبنیات');
    expect(foodLabelFa('بدون نمک', 'dietary')).toBe('بدون نمک');
    expect(foodLabelFa('UNKNOWN', 'allergen')).toContain('از فروشگاه بپرسید');
  });
  it('offers the launch-city center without requiring demo merchant locations', async () => {
    cities.mockResolvedValue([{ id: 'persisted-urmia', slug: 'urmia', nameFa: 'ارومیه', province: { nameFa: 'آذربایجان غربی' }, neighborhoods: [], merchantLocations: [] }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).data[0]).toMatchObject({ id: 'persisted-urmia', center: { latitude: 37.5527, longitude: 45.0761 } });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
