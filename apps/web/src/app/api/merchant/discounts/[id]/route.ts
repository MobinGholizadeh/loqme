import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { merchantService } from '@/domain/merchant/merchant.service';
import { discountService } from '@/domain/discount/discount.service';
import { UpdateDiscountSchema } from '@loqme/validation';
import { extractMerchantId } from '@/lib/http/merchant-http';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handleGET(request: NextRequest, context: RouteContext) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً با حساب کاربری فروشگاه وارد شوید' },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const merchantId = extractMerchantId(request);
    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      session.userId,
      merchantId
    );

    const { id } = await context.params;
    const discount = await discountService.getDiscountById(id);

    if (!discount || discount.merchantId !== merchant.id) {
      return NextResponse.json(
        { success: false, message: 'تخفیف مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    const { redemptions, total } = await discountService.getRedemptions({
      discountId: id,
      merchantId: merchant.id,
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
    console.error('Error in GET /api/merchant/discounts/[id]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت اطلاعات تخفیف' },
      { status: 500 }
    );
  }
}

async function handlePUT(request: NextRequest, context: RouteContext) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً با حساب کاربری فروشگاه وارد شوید' },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const merchantId = extractMerchantId(request);
    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      session.userId,
      merchantId
    );

    const { id } = await context.params;
    const discount = await discountService.getDiscountById(id);

    if (!discount || discount.merchantId !== merchant.id) {
      return NextResponse.json(
        { success: false, message: 'تخفیف مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

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
      session.userId,
      session.role,
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
    console.error('Error in PUT /api/merchant/discounts/[id]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ویرایش تخفیف' },
      { status: 500 }
    );
  }
}

async function handleDELETE(request: NextRequest, context: RouteContext) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً با حساب کاربری فروشگاه وارد شوید' },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const merchantId = extractMerchantId(request);
    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      session.userId,
      merchantId
    );

    const { id } = await context.params;
    const discount = await discountService.getDiscountById(id);

    if (!discount || discount.merchantId !== merchant.id) {
      return NextResponse.json(
        { success: false, message: 'تخفیف مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    const result = await discountService.deleteDiscount(
      session.userId,
      session.role,
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
    console.error('Error in DELETE /api/merchant/discounts/[id]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در حذف تخفیف' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const PUT = withDatabaseRequest(handlePUT);
export const DELETE = withDatabaseRequest(handleDELETE);
