import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { discountService } from '@/domain/discount/discount.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { ValidateCouponSchema } from '@loqme/validation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ValidateCouponSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'اطلاعات اعتبارسنجی کد تخفیف نامعتبر است',
          errors: validated.error.flatten(),
        },
        { status: 400 }
      );
    }

    let customerId = validated.data.customerId;

    // If customerId is not explicitly passed, attempt to extract from session
    if (!customerId) {
      const token = extractSessionToken(request);
      if (token) {
        const payload = await verifySessionToken(token);
        if (payload?.userId) {
          const customer = await prisma.customer.findUnique({
            where: { userId: payload.userId },
            select: { id: true },
          });
          if (customer) {
            customerId = customer.id;
          }
        }
      }
    }

    const result = await discountService.validateCoupon({
      code: validated.data.code,
      customerId,
      merchantId: validated.data.merchantId,
      listingId: validated.data.listingId,
      subtotalToman: validated.data.subtotalToman,
      reservationId: validated.data.reservationId,
    });

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          errorCode: result.errorCode,
          message: result.errorMessageFa || 'کد تخفیف معتبر نیست',
          discountAmountToman: 0,
          finalAmountToman: validated.data.subtotalToman,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      discount: result.discount,
      discountAmountToman: result.discountAmountToman,
      finalAmountToman: result.finalAmountToman,
      message: 'کد تخفیف با موفقیت اعمال شد',
    });
  } catch (error: any) {
    console.error('Error validating discount coupon:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در بررسی کد تخفیف' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
