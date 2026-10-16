import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken, SessionPayload } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function requireAdminSession(
  request: NextRequest
): Promise<{ session: SessionPayload } | { errorResponse: NextResponse }> {
  const token = extractSessionToken(request);
  if (!token) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'لطفاً با حساب کاربری مدیریت ارشد وارد شوید' },
        { status: 401 }
      ),
    };
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر یا منقضی شده است' },
        { status: 401 }
      ),
    };
  }

  if (session.role !== 'ADMIN') {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'دسترسی غیرمجاز: این بخش نیازمند دسترسی مدیر ارشد (ADMIN) می‌باشد' },
        { status: 403 }
      ),
    };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true, isActive: true } });
  if (!user?.isActive || user.role !== 'ADMIN') {
    return { errorResponse: NextResponse.json({ success: false, message: 'دسترسی مدیریت دیگر فعال نیست' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } }) };
  }
  return { session };
}
