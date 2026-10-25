import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { notificationService } from '@/domain/notification/notification.service';

export const dynamic = 'force-dynamic';

async function handlePOST(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: 'احراز هویت نشده' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ success: false, message: 'نشست نامعتبر است' }, { status: 401 });
    }

    const notification = await notificationService.createNotification({
      userId: session.userId,
      role: session.role,
      type: 'SYSTEM_TEST',
      category: 'system',
      title: 'اعلان آزمایشی لقمه',
      body: 'سیستم پوش نوتیفیکیشن با موفقیت روی مرورگر شما فعال شد و کار می‌کند',
      link: '/profile',
    });

    return NextResponse.json({
      success: true,
      message: 'اعلان تستی با موفقیت ارسال شد',
      notification,
    });
  } catch (error: any) {
    console.error('[API/notifications/test] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'خطا در ارسال اعلان آزمایشی' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
