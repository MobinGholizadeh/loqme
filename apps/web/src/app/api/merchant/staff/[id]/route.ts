import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { merchantService } from '@/domain/merchant/merchant.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { extractMerchantId } from '@/lib/http/merchant-http';

export const dynamic = 'force-dynamic';

async function handleDELETE(
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

    const result = await merchantService.removeStaffMember(
      session.userId,
      id,
      merchantId
    );

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/merchant/staff/[id]:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 400;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در لغو دسترسی همکار' },
      { status }
    );
  }
}

export const DELETE = withDatabaseRequest(handleDELETE);
