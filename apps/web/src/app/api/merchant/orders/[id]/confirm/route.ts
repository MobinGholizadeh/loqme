import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/domain/order/order.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { ConfirmMerchantOrderSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

async function handlePOST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: orderId } = await context.params;
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'شناسه سفارش الزامی است' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = ConfirmMerchantOrderSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]?.message || 'اطلاعات وارد شده معتبر نیست';
      return NextResponse.json(
        { success: false, message: issue },
        { status: 400 }
      );
    }

    const result = await orderService.confirmOrderByMerchant({
      merchantUserId: session.userId,
      orderId,
      pickupStart: parseResult.data.pickupStart,
      pickupEnd: parseResult.data.pickupEnd,
      estimatedPreparationMinutes: parseResult.data.estimatedPreparationMinutes,
      noteFa: parseResult.data.noteFa,
    });

    if (!result.success) {
      const isForbidden = result.message?.includes('عدم دسترسی');
      return NextResponse.json(
        { success: false, message: result.message },
        { status: isForbidden ? 403 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.order,
    });
  } catch (error: any) {
    console.error('Error in POST /api/merchant/orders/[id]/confirm:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'خطا در تایید سفارش' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
