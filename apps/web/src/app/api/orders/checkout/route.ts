import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/domain/order/order.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { CheckoutOrderSchema } from '@loqme/validation';
import { prisma } from '@/lib/prisma';
import { PaymentGatewayType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: payload.userId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'حساب مشتری یافت نشد' },
        { status: 404 }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const validated = CheckoutOrderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: 'اطلاعات پرداخت نامعتبر است', errors: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { reservationId, gateway, notesFa } = validated.data;
    const effectiveGateway = process.env.NODE_ENV === 'production'
      ? PaymentGatewayType.ZARINPAL : gateway as PaymentGatewayType;

    // 3. Resolve host and callback URL
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const callbackUrl = `${protocol}://${host}/api/payments/verify`;

    // 4. Create Order and initiate Payment
    const result = await orderService.createOrderFromReservation({
      customerId: customer.id,
      reservationId,
      gateway: effectiveGateway,
      notesFa,
      callbackUrl,
      mobile: payload.mobile,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'سفارش ایجاد شد و آماده انتقال به درگاه پرداخت است',
      data: {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        totalAmountToman: Number(result.order.totalAmountToman),
        paymentUrl: result.paymentUrl,
        authority: result.authority,
        gateway: effectiveGateway,
      },
    });
  } catch (error) {
    console.error('Error in order checkout:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در ثبت و آغاز فرآیند پرداخت سفارش' },
      { status: 500 }
    );
  }
}
