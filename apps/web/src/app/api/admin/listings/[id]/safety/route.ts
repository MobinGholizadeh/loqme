import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { moderationService } from '@/domain/moderation/moderation.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { UpdateListingSafetySchema } from '@loqme/validation';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(token);
    if (!payload || payload.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, message: 'دسترسی تنها برای مدیران سیستم مجاز است' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = UpdateListingSafetySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'وضعیت سلامت یا توضیحات نامعتبر است',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const safety = await moderationService.updateListingSafetyStatus(
      payload.userId,
      id,
      parseResult.data.safetyStatus,
      parseResult.data.reasonFa
    );

    return NextResponse.json({
      success: true,
      message: 'وضعیت سلامت بسته با موفقیت به‌روزرسانی شد',
      safety,
    });
  } catch (error: any) {
    console.error('Error in admin updateListingSafetyStatus API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در تغییر وضعیت سلامت بسته' },
      { status: 400 }
    );
  }
}

export const PATCH = withDatabaseRequest(handlePATCH);
