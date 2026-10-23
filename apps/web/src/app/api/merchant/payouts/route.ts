import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { extractMerchantId } from '@/lib/http/merchant-http';
import { merchantBankService } from '@/domain/merchant/merchant-bank.service';
import { ZodError } from 'zod';

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

    const [wallet, requests] = await Promise.all([
      merchantBankService.getWalletSummary(session.userId, merchantId),
      merchantBankService.listPayoutRequests(session.userId, merchantId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        requests,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/merchant/payouts:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت وضعیت کیف پول و تسویه‌ها' },
      { status }
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
    const body = await request.json();

    const payout = await merchantBankService.requestPayout(
      session.userId,
      merchantId,
      body
    );

    return NextResponse.json(
      {
        success: true,
        message: 'درخواست تسویه با موفقیت ثبت شد و در صف واریز پایا قرار گرفت',
        data: payout,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/merchant/payouts:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0]?.message || 'اطلاعات درخواست تسویه نامعتبر است' },
        { status: 400 }
      );
    }
    const status = error.message?.includes('عدم دسترسی')
      ? 403
      : error.message?.includes('کافی نمی‌باشد') || error.message?.includes('تایید شده') || error.message?.includes('مشابه')
      ? 400
      : error.message?.includes('یافت نشد')
      ? 404
      : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ثبت درخواست تسویه' },
      { status }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const POST = withDatabaseRequest(handlePOST);
