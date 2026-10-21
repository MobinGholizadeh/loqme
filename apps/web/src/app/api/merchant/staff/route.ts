import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { merchantService } from '@/domain/merchant/merchant.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { CreateStaffSchema } from '@loqme/validation';
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

    const staffList = await merchantService.getStaffList(session.userId, merchantId);

    return NextResponse.json({
      success: true,
      count: staffList.length,
      data: staffList,
    });
  } catch (error: any) {
    console.error('Error in GET /api/merchant/staff:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت لیست همکاران فروشگاه' },
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

    const body = await request.json();
    const merchantId = extractMerchantId(request, body.merchantId);

    const validated = CreateStaffSchema.parse(body);

    const newStaff = await merchantService.addStaffMember(
      session.userId,
      validated,
      merchantId
    );

    return NextResponse.json({
      success: true,
      message: 'همکار جدید با موفقیت به کادر فروشگاه اضافه شد',
      data: newStaff,
    });
  } catch (error: any) {
    console.error('Error in POST /api/merchant/staff:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 400;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در افزودن همکار جدید' },
      { status }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const POST = withDatabaseRequest(handlePOST);
