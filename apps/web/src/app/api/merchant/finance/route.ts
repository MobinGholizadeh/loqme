import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { merchantService } from '@/domain/merchant/merchant.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';

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

    const financeSummary = await merchantService.getFinanceSummary(
      session.userId,
      merchantId
    );

    return NextResponse.json({
      success: true,
      data: financeSummary,
    });
  } catch (error: any) {
    console.error('Error in GET /api/merchant/finance:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت گزارش مالی فروشگاه' },
      { status }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
