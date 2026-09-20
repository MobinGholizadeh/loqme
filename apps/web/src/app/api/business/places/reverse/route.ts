import { NextRequest } from 'next/server';
import { BusinessError } from '@/domain/business/application.service';
import { limitMapir, reverseMapir } from '@/lib/business/mapir';
import { businessFailure, businessJson } from '@/lib/business/http';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    limitMapir(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 80) || 'anonymous');
    const latitude = Number(request.nextUrl.searchParams.get('latitude'));
    const longitude = Number(request.nextUrl.searchParams.get('longitude'));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 24 || latitude > 40 || longitude < 44 || longitude > 64) throw new BusinessError(400, 'موقعیت معتبر داخل ایران انتخاب کنید');
    return businessJson(await reverseMapir(latitude, longitude));
  } catch (e) { return businessFailure(e); }
}
