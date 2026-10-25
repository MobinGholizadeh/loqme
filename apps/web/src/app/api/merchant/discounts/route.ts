import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { merchantService } from '@/domain/merchant/merchant.service';
import { discountService } from '@/domain/discount/discount.service';
import { CreateDiscountSchema } from '@loqme/validation';
import { extractMerchantId } from '@/lib/http/merchant-http';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search') || undefined;

    const [result, stats] = await Promise.all([
      discountService.getDiscounts({
        ownerType: 'MERCHANT',
        merchantId: merchant.id,
        search,
        page,
        pageSize,
      }),
      discountService.getDiscountStats(merchant.id),
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
    console.error('Error in GET /api/merchant/discounts:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در بارگذاری تخفیف‌های فروشگاه' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
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

    const body = await request.json();
    const validated = CreateDiscountSchema.safeParse({
      ...body,
      ownerType: 'MERCHANT',
      merchantId: merchant.id,
      fundingSource: 'MERCHANT',
      scope: body.scope === 'LISTING' ? 'LISTING' : 'MERCHANT',
    });

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
      session.userId,
      session.role,
      {
        ...validated.data,
        ownerType: 'MERCHANT',
        merchantId: merchant.id,
        fundingSource: 'MERCHANT',
        scope: validated.data.listingId ? 'LISTING' : 'MERCHANT',
      }
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
    console.error('Error in POST /api/merchant/discounts:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ایجاد تخفیف فروشگاه' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const POST = withDatabaseRequest(handlePOST);
