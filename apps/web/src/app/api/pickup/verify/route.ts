import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { pickupService } from '@/domain/pickup/pickup.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { VerifyPickupSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

async function handlePOST(request: NextRequest) {
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
        { success: false, message: 'نشست کاربری نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = VerifyPickupSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'اطلاعات ارسالی نامعتبر است';
      return NextResponse.json(
        { success: false, message: errorMsg },
        { status: 400 }
      );
    }

    const { qrToken, otpCode, orderNumber, orderId } = parseResult.data;

    const result = await pickupService.verifyPickup({
      merchantUserId: session.userId,
      qrToken,
      otpCode,
      orderNumber,
      orderId,
    });

    return NextResponse.json(result.response, { status: result.statusCode });
  } catch (error) {
    console.error('Error in POST /api/pickup/verify:', error);
    return NextResponse.json(
      { success: false, message: 'خطای سرور در تایید تحویل حضوری' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
