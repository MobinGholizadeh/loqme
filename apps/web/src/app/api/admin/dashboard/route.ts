import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/domain/admin/admin.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const kpis = await adminService.getDashboardKPIs();
    return NextResponse.json({
      success: true,
      data: kpis,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/dashboard:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت آمار کلان داشبورد مدیریت' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
