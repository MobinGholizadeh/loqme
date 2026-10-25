import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { notificationService } from '@/domain/notification/notification.service';
import { NotificationPreferenceSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: 'احراز هویت نشده' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ success: false, message: 'نشست نامعتبر است' }, { status: 401 });
    }

    const preferences = await notificationService.getPreferences(session.userId);

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    console.error('[API/notifications/preferences] GET Error:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت تنظیمات اعلان‌ها' },
      { status: 500 }
    );
  }
}

async function handlePUT(request: NextRequest) {
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
    const parsed = NotificationPreferenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'داده‌های تنظیمات نامعتبر است', errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await notificationService.updatePreferences(session.userId, parsed.data);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('[API/notifications/preferences] PUT Error:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در به‌روزرسانی تنظیمات اعلان‌ها' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const PUT = withDatabaseRequest(handlePUT);
