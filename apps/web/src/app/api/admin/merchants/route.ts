import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/domain/admin/admin.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const merchants = await adminService.listMerchants({ status, search });
    return NextResponse.json({
      success: true,
      count: merchants.length,
      data: merchants,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/merchants:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت لیست فروشگاه‌ها' },
      { status: 500 }
    );
  }
}
