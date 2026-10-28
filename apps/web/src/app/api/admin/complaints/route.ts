import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { moderationService } from '@/domain/moderation/moderation.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { ComplaintCategory, ComplaintStatus, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ComplaintStatus | null;
    const category = searchParams.get('category') as ComplaintCategory | null;
    const merchantId = searchParams.get('merchantId') || undefined;
    const limit = Number(searchParams.get('limit')) || 50;
    const offset = Number(searchParams.get('offset')) || 0;

    const result = await moderationService.listComplaints({
      status: status || undefined,
      category: category || undefined,
      merchantId,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      ...JSON.parse(
        JSON.stringify(result, (_, value) =>
          typeof value === "bigint" ? Number(value) : value
        )
      ),
    });
  } catch (error: any) {
    console.error('Error in admin listComplaints API:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت لیست شکایات' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
