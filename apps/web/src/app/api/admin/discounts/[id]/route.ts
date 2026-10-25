import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { discountService } from '@/domain/discount/discount.service';
import { UpdateDiscountSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handleGET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const discount = await discountService.getDiscountById(id);

    if (!discount) {
      return NextResponse.json(
        { success: false, message: 'تخفیف مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    const { redemptions, total } = await discountService.getRedemptions({
      discountId: id,
      pageSize: 50,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...discount,
        redemptions,
        totalRedemptions: total,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/discounts/[id]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت اطلاعات تخفیف' },
      { status: 500 }
    );
  }
}

async function handlePUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const validated = UpdateDiscountSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'اطلاعات ویرایش نامعتبر است',
          errors: validated.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await discountService.updateDiscount(
      auth.session.userId,
      auth.session.role,
      id,
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
    console.error('Error in PUT /api/admin/discounts/[id]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ویرایش تخفیف' },
      { status: 500 }
    );
  }
}

async function handleDELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const result = await discountService.deleteDiscount(
      auth.session.userId,
      auth.session.role,
      id
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
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/discounts/[id]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در حذف تخفیف' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const PUT = withDatabaseRequest(handlePUT);
export const DELETE = withDatabaseRequest(handleDELETE);
