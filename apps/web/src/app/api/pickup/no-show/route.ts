import { NextRequest, NextResponse } from 'next/server';
import { pickupService } from '@/domain/pickup/pickup.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ success: false, message: 'ورود به حساب کاربری الزامی است' }, { status: 401 });
    }
    if (session.role === Role.CUSTOMER) {
      return NextResponse.json(
        { success: false, message: 'عدم دسترسی کافی برای اجرای پاکسازی عدم مراجعه' },
        { status: 403 }
      );
    }

    const result = await pickupService.sweepNoShows();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/pickup/no-show:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در اجرای فرآیند پاکسازی سفارش‌های منقضی' },
      { status: 500 }
    );
  }
}
