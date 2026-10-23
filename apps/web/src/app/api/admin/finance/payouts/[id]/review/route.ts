import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { adminBankService } from '@/domain/admin/admin-bank.service';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await adminBankService.reviewPayoutRequest(
      auth.session.userId,
      id,
      body
    );

    let message = 'درخواست تسویه با موفقیت بررسی شد';
    if (body.action === 'APPROVE') message = 'درخواست تسویه تایید شد';
    if (body.action === 'COMPLETE') message = 'تسویه با موفقیت نهایی و پرداخت شد';
    if (body.action === 'REJECT') message = 'درخواست تسویه رد شد و وجه به کیف پول بازگشت';

    return NextResponse.json({
      success: true,
      message,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/finance/payouts/[id]/review:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0]?.message || 'اطلاعات وارد شده نامعتبر است' },
        { status: 400 }
      );
    }
    const status = error.message?.includes('یافت نشد')
      ? 404
      : error.message?.includes('قبلاً') || error.message?.includes('الزامی')
      ? 400
      : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در بررسی درخواست تسویه' },
      { status }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
