import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { notificationService } from '@/domain/notification/notification.service';
import { PushSubscriptionSchema } from '@loqme/validation';

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
    const userAgent = request.headers.get('user-agent') || undefined;

    const parsed = PushSubscriptionSchema.safeParse({
      ...body,
      userAgent: body.userAgent || userAgent,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'داده‌های اشتراک پوش نامعتبر است', errors: parsed.error.format() },
        { status: 400 }
      );
    }

    await notificationService.savePushSubscription(session.userId, parsed.data);

    return NextResponse.json({
      success: true,
      message: 'اشتراک وب پوش با موفقیت فعال شد',
    });
  } catch (error: any) {
    console.error('[API/notifications/push/subscribe] Error:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در ثبت اشتراک پوش نوتیفیکیشن' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
