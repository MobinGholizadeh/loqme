import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { extractMerchantId } from '@/lib/http/merchant-http';
import { merchantBankService } from '@/domain/merchant/merchant-bank.service';

export const dynamic = 'force-dynamic';

async function handlePOST(
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

    const updated = await merchantBankService.setDefaultBankAccount(
      session.userId,
      merchantId,
      id
    );

    return NextResponse.json({
      success: true,
      message: 'حساب بانکی به عنوان حساب پیش‌فرض تسویه انتخاب شد',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error in POST /api/merchant/bank-accounts/[id]/default:', error);
    const status = error.message?.includes('عدم دسترسی')
      ? 403
      : error.message?.includes('یافت نشد')
      ? 404
      : error.message?.includes('تایید شده')
      ? 400
      : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در تعیین حساب پیش‌فرض' },
      { status }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
