import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { adminBankService } from '@/domain/admin/admin-bank.service';
import { BankAccountStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const statusFilter = statusParam && Object.values(BankAccountStatus).includes(statusParam as any)
      ? (statusParam as BankAccountStatus)
      : undefined;

    const accounts = await adminBankService.listBankAccountsForAdmin(auth.session.userId, statusFilter);

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/finance/bank-accounts:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت لیست حساب‌های بانکی همکاران' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
