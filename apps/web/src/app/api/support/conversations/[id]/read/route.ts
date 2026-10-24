import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { supportService } from '@/domain/support/support.service';

export const dynamic = 'force-dynamic';

async function handlePOST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً ابتدا وارد حساب کاربری شوید' },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const result = await supportService.markAsRead(
      id,
      session.userId,
      session.role as any
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in POST /api/support/conversations/[id]/read:', error);
    const isForbidden = error.message?.includes('مجاز نیست');
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ثبت وضعیت خوانده شدن' },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
