import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { supportService } from '@/domain/support/support.service';
import { SendMessageSchema } from '@loqme/validation';
import { ZodError } from 'zod';

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
    const body = await request.json().catch(() => ({}));
    const validated = SendMessageSchema.parse(body);

    const message = await supportService.sendMessage({
      conversationId: id,
      senderUserId: session.userId,
      senderRole: session.role as any,
      body: validated.body,
      clientMessageId: validated.clientMessageId,
      attachmentIds: validated.attachmentIds,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0]?.message || 'متن پیام نامعتبر است' },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/support/conversations/[id]/messages:', error);
    const isForbidden = error.message?.includes('مجاز نیست');
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ارسال پیام' },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
