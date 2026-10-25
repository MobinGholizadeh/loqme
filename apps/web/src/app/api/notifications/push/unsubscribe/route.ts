import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { notificationService } from '@/domain/notification/notification.service';
import { UnsubscribePushSchema } from '@loqme/validation';

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

    const body = await request.json();
    const parsed = UnsubscribePushSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'آدرس اشتراک نامعتبر است' },
        { status: 400 }
      );
    }

    await notificationService.removePushSubscription(session.userId, parsed.data.endpoint);

    return NextResponse.json({
      success: true,
      message: 'اشتراک پوش غیرفعال شد',
    });
  } catch (error: any) {
    console.error('[API/notifications/push/unsubscribe] Error:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در لغو اشتراک پوش نوتیفیکیشن' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
