import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { reservationService } from '@/domain/reservation/reservation.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token = extractSessionToken(request);
    if (!token) return NextResponse.json({ success: false, message: 'احراز هویت الزامی است' }, { status: 401 });
    const payload = await verifySessionToken(token);
    if (!payload) return NextResponse.json({ success: false, message: 'نشست کاربری نامعتبر است' }, { status: 401 });
    const customer = await prisma.customer.findUnique({ where: { userId: payload.userId } });
    if (!customer) return NextResponse.json({ success: false, message: 'حساب مشتری یافت نشد' }, { status: 404 });

    const reservation = await reservationService.getReservation(id);

    if (!reservation || reservation.customerId !== customer.id) {
      return NextResponse.json(
        { success: false, message: 'رزرو مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    const listing = reservation.listing;
    const merchant = listing.merchant;
    const location = merchant.locations[0];

    const startHours = listing.pickupStart.getHours().toString().padStart(2, '0');
    const startMins = listing.pickupStart.getMinutes().toString().padStart(2, '0');
    const endHours = listing.pickupEnd.getHours().toString().padStart(2, '0');
    const endMins = listing.pickupEnd.getMinutes().toString().padStart(2, '0');

    return NextResponse.json({
      success: true,
      data: {
        id: reservation.id,
        listingId: reservation.listingId,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt.toISOString(),
        remainingSeconds: reservation.remainingSeconds,
        isExpired: reservation.isExpired,
        listing: {
          id: listing.id,
          titleFa: listing.titleFa,
          storeNameFa: merchant.businessNameFa,
          addressFa: location?.addressFa,
          originalPriceToman: Number(listing.originalPriceToman),
          discountedPriceToman: Number(listing.discountedPriceToman),
          totalPriceToman: Number(listing.discountedPriceToman) * reservation.quantity,
          savingsToman: (Number(listing.originalPriceToman) - Number(listing.discountedPriceToman)) * reservation.quantity,
          pickupWindowFa: `${startHours}:${startMins} تا ${endHours}:${endMins}`,
          pickupEndIso: listing.pickupEnd.toISOString(),
        },
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت وضعیت رزرو' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: 'احراز هویت الزامی است' }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'نشست کاربری نامعتبر است' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: payload.userId },
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: 'حساب مشتری یافت نشد' }, { status: 404 });
    }

    const result = await reservationService.cancelReservation(id, customer.id);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json({ success: false, message: 'خطا در لغو رزرو' }, { status: 500 });
  }
}

export const GET = withDatabaseRequest(handleGET);
export const DELETE = withDatabaseRequest(handleDELETE);
