import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { pickupService } from '@/domain/pickup/pickup.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';

import { extractMerchantId } from '@/lib/http/merchant-http';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً با حساب کاربری فروشگاه وارد شوید' },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const merchantId = extractMerchantId(request);

    const queue = await pickupService.getMerchantPickupQueue(session.userId, merchantId);

    return NextResponse.json({
      success: true,
      count: queue.length,
      data: queue,
    });
  } catch (error) {
    console.error('Error in GET /api/merchant/pickup/queue:', error);
    const forbidden = error instanceof Error && error.message.includes('عدم دسترسی');
    return NextResponse.json(
      { success: false, message: forbidden ? 'به صف تحویل این فروشگاه دسترسی ندارید' : 'خطا در دریافت صف تحویل حضوری فروشگاه' },
      { status: forbidden ? 403 : 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
