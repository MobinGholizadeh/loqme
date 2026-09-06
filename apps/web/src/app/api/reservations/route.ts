import { NextRequest, NextResponse } from 'next/server';
import { reservationService } from '@/domain/reservation/reservation.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { CreateReservationSchema } from '@loqme/validation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate customer
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
        { success: false, message: 'نشست کاربری نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }

    // 2. Fetch or initialize customer record
    let customer = await prisma.customer.findUnique({
      where: { userId: payload.userId },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId: payload.userId,
          fullName: payload.fullName,
        },
      });
    }

    // 3. Validate request body
    const body = await request.json();
    const validated = CreateReservationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: 'اطلاعات درخواست رزرو نامعتبر است', errors: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { listingId, quantity } = validated.data;

    // 4. Create atomic reservation
    const result = await reservationService.createReservation({
      customerId: customer.id,
      listingId,
      quantity,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'بسته به مدت ۱۰ دقیقه برای شما رزرو شد',
      data: result.reservation,
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در ثبت رزرو بسته' },
      { status: 500 }
    );
  }
}
