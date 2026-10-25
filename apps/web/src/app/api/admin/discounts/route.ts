import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { discountService } from '@/domain/discount/discount.service';
import { CreateDiscountSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const ownerType = searchParams.get('ownerType') as 'ADMIN' | 'MERCHANT' | undefined;
    const merchantId = searchParams.get('merchantId') || undefined;
    const scope = searchParams.get('scope') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const [result, stats] = await Promise.all([
      discountService.getDiscounts({
        ownerType,
        merchantId,
        scope,
        isActive,
        search,
        page,
        pageSize,
      }),
      discountService.getDiscountStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: result.discounts,
      stats,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/discounts:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در بارگذاری فهرست تخفیف‌ها' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const validated = CreateDiscountSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'اطلاعات ورودی تخفیف نامعتبر است',
          errors: validated.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await discountService.createDiscount(
      auth.session.userId,
      auth.session.role,
      validated.data
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.discount,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/discounts:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ایجاد تخفیف جدید' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const POST = withDatabaseRequest(handlePOST);
