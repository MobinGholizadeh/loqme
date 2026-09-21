import { NextRequest, NextResponse } from 'next/server';
import { listingService } from '@/domain/listing/listing.service';
import { merchantService } from '@/domain/merchant/merchant.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { UpdateListingStockSchema } from '@loqme/validation';
import { ListingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(
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

    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const merchantId = searchParams.get('merchantId') || body.merchantId || undefined;

    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      session.userId,
      merchantId
    );

    const validated = UpdateListingStockSchema.parse(body);

    // Case 1: Status toggle (e.g. PUBLISHED <-> PAUSED)
    if (validated.status && validated.deltaQuantity === undefined && validated.totalQuantity === undefined) {
      const updated = await listingService.toggleListingStatus(
        merchant.id,
        id,
        validated.status as ListingStatus
      );
      return NextResponse.json({
        success: true,
        message: 'وضعیت بسته با موفقیت بروزرسانی شد',
        data: {
          id: updated.id,
          status: updated.status,
        },
      });
    }

    // Case 2: Stock Adjustment
    const updated = await listingService.adjustListingStock(merchant.id, id, {
      deltaQuantity: validated.deltaQuantity,
      totalQuantity: validated.totalQuantity,
      status: validated.status as ListingStatus,
    });

    return NextResponse.json({
      success: true,
      message: 'موجودی بسته با موفقیت بروزرسانی شد',
      data: {
        id: updated.id,
        status: updated.status,
        totalQuantity: updated.inventory.totalQuantity,
        reservedQuantity: updated.inventory.reservedQuantity,
        soldQuantity: updated.inventory.soldQuantity,
      },
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/merchant/listings/[id]:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 400;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ویرایش بسته' },
      { status }
    );
  }
}

export async function DELETE(
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

    const searchParams = request.nextUrl.searchParams;
    const merchantId = searchParams.get('merchantId') || undefined;

    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      session.userId,
      merchantId
    );

    // Archive / expire listing
    const updated = await listingService.toggleListingStatus(
      merchant.id,
      id,
      ListingStatus.EXPIRED
    );

    return NextResponse.json({
      success: true,
      message: 'بسته با موفقیت از بازار برداشته شد',
      data: { id: updated.id, status: updated.status },
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/merchant/listings/[id]:', error);
    const status = error.message?.includes('عدم دسترسی') ? 403 : 400;
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در حذف بسته' },
      { status }
    );
  }
}
