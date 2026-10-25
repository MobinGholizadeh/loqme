import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { discountService } from '@/domain/discount/discount.service';
import { BulkGenerateDiscountsSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

async function handlePOST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const validated = BulkGenerateDiscountsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'تنظیمات تولید کدهای تخفیف نامعتبر است',
          errors: validated.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await discountService.bulkGenerateDiscounts(
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
      count: result.count,
      codes: result.codes,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/discounts/generate:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در تولید کدهای تخفیف' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
