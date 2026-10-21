import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { merchantService } from '@/domain/merchant/merchant.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { UpdateStoreSettingsSchema } from '@loqme/validation';
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

    const settings = await merchantService.getStoreSettings(session.userId, merchantId);

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error('Error in GET /api/merchant/settings:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت تنظیمات فروشگاه' },
      { status }
    );
  }
}

async function handlePUT(request: NextRequest) {
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

    const body = await request.json();
    const merchantId = extractMerchantId(request, body.merchantId);

    const validated = UpdateStoreSettingsSchema.parse(body);

    const result = await merchantService.updateStoreSettings(
      session.userId,
      validated,
      merchantId
    );

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Error in PUT /api/merchant/settings:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 400;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ذخیره تنظیمات فروشگاه' },
      { status }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const PUT = withDatabaseRequest(handlePUT);
