import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/domain/order/order.service';
import { PaymentVerifySchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

/**
 * GET Handler: Handles browser redirects from payment gateways (e.g. Shaparak / Zarinpal callback)
 */
async function handleGET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authority =
      searchParams.get('Authority') ||
      searchParams.get('authority') ||
      searchParams.get('trackId') ||
      '';
    const status = searchParams.get('Status') || searchParams.get('status') || '';
    const trackingCode = searchParams.get('trackingCode') || undefined;

    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    if (!authority) {
      return NextResponse.redirect(new URL('/explore?error=missing_authority', request.url));
    }

    // If status is explicitly cancelled / NOK
    if (status && (status.toUpperCase() === 'NOK' || status.toUpperCase() === 'CANCELLED')) {
      const cancelledUrl = new URL('/explore', request.url);
      cancelledUrl.searchParams.set('error', 'payment_cancelled');
      cancelledUrl.searchParams.set('authority', authority);
      return NextResponse.redirect(cancelledUrl);
    }

    const verifyResult = await orderService.verifyAndCompleteOrder({
      authority,
      trackingCode,
      ipAddress,
    });

    if (verifyResult.success && verifyResult.order) {
      const receiptUrl = new URL(`/orders/${verifyResult.order.id}/receipt`, request.url);
      receiptUrl.searchParams.set('status', 'success');
      if (verifyResult.referenceId) {
        receiptUrl.searchParams.set('ref', verifyResult.referenceId);
      }
      return NextResponse.redirect(receiptUrl);
    }

    const failedUrl = new URL(
      verifyResult.order?.id ? `/orders/${verifyResult.order.id}/receipt` : '/orders',
      request.url
    );
    failedUrl.searchParams.set('status', 'failed');
    failedUrl.searchParams.set('msg', verifyResult.message || 'پرداخت توسط درگاه بانکی تایید نشد');
    return NextResponse.redirect(failedUrl);
  } catch (error) {
    console.error('Error handling payment GET callback:', error);
    return NextResponse.redirect(new URL('/explore?error=server_error', request.url));
  }
}

/**
 * POST Handler: Handles server-to-server webhook callbacks or direct API clients (Mobile / headless)
 */
async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = PaymentVerifySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: 'اطلاعات تایید پرداخت نامعتبر است', errors: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { authority, trackingCode } = validated.data;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    const verifyResult = await orderService.verifyAndCompleteOrder({
      authority,
      trackingCode,
      ipAddress,
    });

    if (!verifyResult.success) {
      return NextResponse.json(
        { success: false, message: verifyResult.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'پرداخت با موفقیت تایید و سفارش نهایی شد',
      data: {
        orderId: verifyResult.order.id,
        orderNumber: verifyResult.orderNumber,
        referenceId: verifyResult.referenceId,
        status: verifyResult.order.status,
      },
    });
  } catch (error) {
    console.error('Error handling payment POST verification:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در تایید تراکنش بانکی' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const POST = withDatabaseRequest(handlePOST);
