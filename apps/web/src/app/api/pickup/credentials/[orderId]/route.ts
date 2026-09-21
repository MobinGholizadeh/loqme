import { NextRequest, NextResponse } from 'next/server';
import { pickupService } from '@/domain/pickup/pickup.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'شناسه سفارش الزامی است' },
        { status: 400 }
      );
    }

    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
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

    // Check if customer profile exists
    const customer = await prisma.customer.findUnique({
      where: { userId: session.userId },
    });

    const isPlatformAdmin = session.role === Role.ADMIN;
    const customerId = isPlatformAdmin ? undefined : customer?.id;

    const credentials = await pickupService.getCustomerPickupCredentials(orderId, customerId);

    if (!credentials) {
      return NextResponse.json(
        { success: false, message: 'سفارش یافت نشد یا دسترسی به آن مجاز نمی‌باشد' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: credentials,
    });
  } catch (error) {
    console.error('Error in GET /api/pickup/credentials:', error);
    return NextResponse.json(
      { success: false, message: 'خطای سرور در دریافت کارت تحویل حضوری' },
      { status: 500 }
    );
  }
}
