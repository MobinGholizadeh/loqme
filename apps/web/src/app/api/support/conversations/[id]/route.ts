import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { supportService } from '@/domain/support/support.service';

export const dynamic = 'force-dynamic';

async function handleGET(
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
    const conversation = await supportService.getConversation(
      id,
      session.userId,
      session.role as any
    );

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('Error in GET /api/support/conversations/[id]:', error);
    const isForbidden = error.message?.includes('مجاز نیست');
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در بارگذاری گفتگو' },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
