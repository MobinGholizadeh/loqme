import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/domain/moderation/audit.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = Number(searchParams.get('limit')) || 50;
    const offset = Number(searchParams.get('offset')) || 0;

    const result = await auditService.listAuditLogs({
      entityType,
      entityId,
      action,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in admin listAuditLogs API:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت لاگ‌های حسابرسی' },
      { status: 500 }
    );
  }
}
