import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { supportService } from '@/domain/support/support.service';
import { UpdateConversationStatusSchema } from '@loqme/validation';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

async function handlePATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdminSession(request);
    if ('errorResponse' in authResult) {
      return authResult.errorResponse;
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const validated = UpdateConversationStatusSchema.parse(body);

    const updated = await supportService.updateConversationStatus(
      id,
      authResult.session.userId,
      validated.status as any,
      validated.priority as any
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0]?.message || 'وضعیت ارسالی نامعتبر است' },
        { status: 400 }
      );
    }
    console.error('Error in PATCH /api/support/conversations/[id]/status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در تغییر وضعیت گفتگو' },
      { status: 500 }
    );
  }
}

export const PATCH = withDatabaseRequest(handlePATCH);
