import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { adminBankService } from '@/domain/admin/admin-bank.service';
import { PayoutRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const statusFilter = statusParam && Object.values(PayoutRequestStatus).includes(statusParam as any)
      ? (statusParam as PayoutRequestStatus)
      : undefined;

    const payouts = await adminBankService.listPayoutRequestsForAdmin(auth.session.userId, statusFilter);

    return NextResponse.json({
      success: true,
      data: payouts,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/finance/payouts:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت لیست درخواست‌های تسویه' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
