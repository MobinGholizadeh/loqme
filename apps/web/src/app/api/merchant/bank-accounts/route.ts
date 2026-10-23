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
    const accounts = await merchantBankService.listBankAccounts(session.userId, merchantId);

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error: any) {
    console.error('Error in GET /api/merchant/bank-accounts:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت لیست حساب‌های بانکی' },
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

    const created = await merchantBankService.addBankAccount(
      session.userId,
      merchantId,
      body
    );

    return NextResponse.json(
      {
        success: true,
        message: 'حساب بانکی با موفقیت ثبت شد و پس از بررسی و تایید مدیریت آماده استفاده خواهد بود',
        data: created,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/merchant/bank-accounts:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0]?.message || 'اطلاعات وارد شده نامعتبر است' },
        { status: 400 }
      );
    }
    const status = error.message?.includes('عدم دسترسی')
      ? 403
      : error.message?.includes('قبلاً')
      ? 409
      : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ثبت حساب بانکی' },
      { status }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const POST = withDatabaseRequest(handlePOST);
