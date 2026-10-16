import { NextRequest, NextResponse } from 'next/server';
import { ReconcilePaymentSchema } from '@loqme/validation';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { readBoundedBody } from '@/lib/business/bounded-body';
import { reconcilePayment } from '@/domain/payment/reconciliation.service';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  const origin = request.headers.get('origin');
  const allowed = new Set([request.nextUrl.origin, ...(process.env.NEXT_PUBLIC_APP_URL ? [new URL(process.env.NEXT_PUBLIC_APP_URL).origin] : [])]);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (origin && !allowed.has(origin)) return NextResponse.json({ success: false }, { status: 403, headers });
  try {
    const input = ReconcilePaymentSchema.parse(JSON.parse(await readBoundedBody(request.body, 2048)));
    const result = await reconcilePayment((await params).id, auth.session.userId, input.action);
    return NextResponse.json(result, { status: result.success ? 200 : 409, headers });
  } catch { return NextResponse.json({ success: false, message: 'بررسی انجام نشد؛ ورودی و دسترسی را بررسی کنید' }, { status: 400, headers }); }
}
