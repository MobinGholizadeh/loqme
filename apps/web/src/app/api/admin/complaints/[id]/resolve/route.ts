import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { moderationService } from '@/domain/moderation/moderation.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { ResolveComplaintSchema } from '@loqme/validation';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'دسترسی غیرمجاز؛ لطفاً وارد شوید' },
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
    const parseResult = ResolveComplaintSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'اطلاعات تعیین تکلیف شکایت نامعتبر است',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const resolved = await moderationService.resolveComplaint(
      payload.userId,
      id,
      parseResult.data
    );

    return NextResponse.json({
      success: true,
      message: 'شکایت با موفقیت تعیین تکلیف شد',
      complaint: resolved,
    });
  } catch (error: any) {
    console.error('Error in admin resolveComplaint API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در تعیین تکلیف شکایت' },
      { status: 400 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
