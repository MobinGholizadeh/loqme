import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { extractMerchantId } from '@/lib/http/merchant-http';
import { merchantBankService } from '@/domain/merchant/merchant-bank.service';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const body = await request.json();

    const updated = await merchantBankService.updateBankAccount(
      session.userId,
      merchantId,
      id,
      body
    );

    return NextResponse.json({
      success: true,
      message: 'اطلاعات حساب بانکی ویرایش گردید',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error in PUT /api/merchant/bank-accounts/[id]:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0]?.message || 'اطلاعات وارد شده نامعتبر است' },
        { status: 400 }
      );
    }
    const status = error.message?.includes('عدم دسترسی')
      ? 403
      : error.message?.includes('یافت نشد')
      ? 404
      : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ویرایش حساب بانکی' },
      { status }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const result = await merchantBankService.deleteBankAccount(
      session.userId,
      merchantId,
      id
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in DELETE /api/merchant/bank-accounts/[id]:', error);
    const status = error.message?.includes('عدم دسترسی')
      ? 403
      : error.message?.includes('یافت نشد')
      ? 404
      : error.message?.includes('در حال پردازش')
      ? 400
      : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در حذف حساب بانکی' },
      { status }
    );
  }
}

export const PUT = withDatabaseRequest(handlePUT);
export const DELETE = withDatabaseRequest(handleDELETE);
