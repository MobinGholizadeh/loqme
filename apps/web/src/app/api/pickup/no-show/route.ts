import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { pickupService } from '@/domain/pickup/pickup.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { Role } from '@prisma/client';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { requireMerchantContext } from '@/domain/merchant/merchant-access.service';
import { requireMutationOrigin } from '@/lib/http/merchant-http';

export const dynamic = 'force-dynamic';

async function handlePOST(request: NextRequest) {
  try {
    requireMutationOrigin(request);
    const token = extractSessionToken(request);
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ success: false, message: 'ورود به حساب کاربری الزامی است' }, { status: 401 });
    }
    if (session.role === Role.CUSTOMER) {
      return NextResponse.json(
        { success: false, message: 'عدم دسترسی کافی برای اجرای پاکسازی عدم مراجعه' },
        { status: 403 }
      );
    }

    let merchantId: string | undefined;
    if (session.role === Role.ADMIN) {
      const admin = await requireAdminSession(request);
      if ('errorResponse' in admin) return admin.errorResponse;
    } else {
      try {
        merchantId = (await requireMerchantContext(session.userId, request.nextUrl.searchParams.get('merchantId') || undefined, 'PICKUP_READ')).merchantId;
      } catch {
        return NextResponse.json({ success: false, message: 'عدم دسترسی به فروشگاه' }, { status: 403 });
      }
    }
    const result = await pickupService.sweepNoShows(merchantId);

    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error in POST /api/pickup/no-show:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در اجرای فرآیند پاکسازی سفارش‌های منقضی' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
