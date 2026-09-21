import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: merchantId } = await params;

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
        { success: false, message: 'نشست کاربری نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }

    // 2. Fetch or verify customer record
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

    // 3. Verify merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'فروشگاه مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // 4. Toggle favorite state
    const existing = await prisma.favorite.findUnique({
      where: {
        customerId_merchantId: {
          customerId: customer.id,
          merchantId,
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({
        success: true,
        isFavorited: false,
        message: 'از لیست علاقه‌مندی‌ها حذف شد',
      });
    } else {
      await prisma.favorite.create({
        data: {
          customerId: customer.id,
          merchantId,
        },
      });
      return NextResponse.json({
        success: true,
        isFavorited: true,
        message: 'به لیست علاقه‌مندی‌ها افزوده شد',
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در ثبت علاقه‌مندی' },
      { status: 500 }
    );
  }
}
