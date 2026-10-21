import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/domain/admin/admin.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;

    const customers = await adminService.listCustomers({ search });
    return NextResponse.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/customers:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت لیست مشتریان' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
