import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { listMerchantContexts } from '@/domain/merchant/merchant-access.service';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: NextRequest) {
  const token = extractSessionToken(request);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ success: false }, { status: 401, headers });
  try { return NextResponse.json({ success: true, data: await listMerchantContexts(session.userId) }, { headers }); }
  catch { return NextResponse.json({ success: false, message: 'دسترسی به فروشگاه فعال نیست' }, { status: 403, headers }); }
}
