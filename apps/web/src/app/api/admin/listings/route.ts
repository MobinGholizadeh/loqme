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
    const categoryId = searchParams.get('categoryId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const listings = await adminService.listGlobalListings({
      categoryId,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      count: listings.length,
      data: listings,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/listings:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت لیست بسته‌های پلتفرم' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
