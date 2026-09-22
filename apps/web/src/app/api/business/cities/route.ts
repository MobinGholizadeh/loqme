import { prisma } from '@/lib/prisma';
import { businessFailure, businessJson } from '@/lib/business/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const cities = await prisma.city.findMany({ include: { province: true, neighborhoods: { select: { centerLat: true, centerLng: true }, take: 1, orderBy: { nameFa: 'asc' } }, merchantLocations: { select: { latitude: true, longitude: true }, take: 1, orderBy: { createdAt: 'asc' } } }, orderBy: { nameFa: 'asc' } });
    return businessJson(cities.map(c => ({ id: c.id, nameFa: c.nameFa, provinceNameFa: c.province.nameFa, slug: c.slug,
      center: c.neighborhoods[0] ? { latitude: c.neighborhoods[0].centerLat, longitude: c.neighborhoods[0].centerLng }
        : c.merchantLocations[0] || (c.slug === 'urmia' ? { latitude: 37.5527, longitude: 45.0761 } : null),
    })));
  } catch (e) { return businessFailure(e); }
}
