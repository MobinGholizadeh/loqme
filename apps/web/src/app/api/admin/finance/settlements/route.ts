import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/domain/admin/admin.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const report = await adminService.getSettlementReport();
    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/finance/settlements:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در محاسبه تسویه‌حساب‌های مالی فروشگاه‌ها' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
