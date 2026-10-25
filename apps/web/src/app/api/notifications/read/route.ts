import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { notificationService } from '@/domain/notification/notification.service';
import { MarkNotificationReadSchema } from '@loqme/validation';

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

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body means mark all as read
    }

    const parsed = MarkNotificationReadSchema.safeParse(body);
    const notificationId = parsed.success ? parsed.data.notificationId : undefined;

    const result = await notificationService.markAsRead(session.userId, notificationId);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
    });
  } catch (error: any) {
    console.error('[API/notifications/read] Error:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در علامت‌گذاری اعلان' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
