import { NextRequest, NextResponse } from 'next/server';
import { pickupService } from '@/domain/pickup/pickup.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (token) {
      const session = await verifySessionToken(token);
      // If user is authenticated, ensure they are staff/owner or admin
      if (session && session.role === Role.CUSTOMER) {
        return NextResponse.json(
          { success: false, message: 'عدم دسترسی کافی برای اجرای پاکسازی عدم مراجعه' },
          { status: 403 }
        );
      }
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
