import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BusinessError } from '@/domain/business/application.service';
import { limitMapir, searchMapir } from '@/lib/business/mapir';
import { businessFailure, businessJson } from '@/lib/business/http';
export const dynamic = 'force-dynamic';
async function handleGET(request: NextRequest) {
  try {
    limitMapir(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 80) || 'anonymous');
    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    const cityId = request.nextUrl.searchParams.get('cityId') || '';
    if (query.length < 2 || query.length > 100 || cityId.length > 100) throw new BusinessError(400, 'نام کسب‌وکار و شهر معتبر را وارد کنید');
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new BusinessError(400, 'شهر انتخاب‌شده در لقمه فعال نیست');
    return businessJson(await searchMapir(query, city.nameFa));
  } catch (e) { return businessFailure(e); }
}

export const GET = withDatabaseRequest(handleGET);
