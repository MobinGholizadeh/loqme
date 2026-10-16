import { NextRequest, NextResponse } from 'next/server';
import { MerchantReportQuerySchema } from '@loqme/validation';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { getMerchantDataReport } from '@/domain/merchant/merchant-report.service';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: NextRequest) {
  const token = extractSessionToken(request);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ success: false }, { status: 401, headers });
  const input = MerchantReportQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!input.success) return NextResponse.json({ success: false, message: 'فروشگاه و بازه گزارش را بررسی کنید' }, { status: 400, headers });
  try {
    const { merchantId, locationId, days } = input.data;
    return NextResponse.json({ success: true, data: await getMerchantDataReport(session.userId, merchantId, locationId, days === '30' ? 30 : 7) }, { headers });
  } catch (error) {
    const denied = error instanceof Error && error.message.includes('عدم دسترسی');
    return NextResponse.json({ success: false, message: denied ? 'این گزارش مخصوص مالک فروشگاه است' : 'گزارش دریافت نشد؛ دوباره تلاش کنید' }, { status: denied ? 403 : 500, headers });
  }
}
