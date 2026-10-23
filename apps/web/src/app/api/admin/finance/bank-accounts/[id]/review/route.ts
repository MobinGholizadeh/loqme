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
    const reviewed = await adminBankService.reviewBankAccount(
      auth.session.userId,
      id,
      body
    );

    return NextResponse.json({
      success: true,
      message: reviewed.status === 'APPROVED' ? 'حساب بانکی تایید شد' : 'حساب بانکی رد شد',
      data: reviewed,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/finance/bank-accounts/[id]/review:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0]?.message || 'اطلاعات وارد شده نامعتبر است' },
        { status: 400 }
      );
    }
    const status = error.message?.includes('یافت نشد') ? 404 : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در بررسی حساب بانکی' },
      { status }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
