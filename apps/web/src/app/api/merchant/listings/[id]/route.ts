import { withDatabaseRequest } from '@/lib/db/request';
import { updatePickupDetails } from '@/domain/listing/pickup-details';
import { updateListingImage } from '@/domain/listing/update-image';
import { NextRequest, NextResponse } from 'next/server';
import { listingService } from '@/domain/listing/listing.service';
import { merchantService } from '@/domain/merchant/merchant.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { UpdateListingStockSchema } from '@loqme/validation';
import { ListingStatus } from '@prisma/client';
import { readMerchantJson, requireMutationOrigin, extractMerchantId } from '@/lib/http/merchant-http';

export const dynamic = 'force-dynamic';

async function handlePATCH(
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

    const body = await readMerchantJson(request);
    const merchantId = extractMerchantId(request, body.merchantId);

    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      session.userId,
      merchantId,
      'MANAGER'
    );

    if (body.imageUrl !== undefined) {
      if (body.pickupDetails !== undefined || body.status !== undefined || body.deltaQuantity !== undefined || body.totalQuantity !== undefined) throw new Error('تصویر را جداگانه ذخیره کنید');
      const imageUrl = await updateListingImage(merchant.id, id, body.imageUrl, session.userId);
      return NextResponse.json({ success: true, data: { id, imageUrl } });
    }
    if (body.pickupDetails !== undefined) {
      if (body.status !== undefined || body.deltaQuantity !== undefined || body.totalQuantity !== undefined) throw new Error('راهنمای دریافت را جداگانه ذخیره کنید');
      const pickupDetails = await updatePickupDetails(merchant.id, id, body.pickupDetails, session.userId);
      return NextResponse.json({ success: true, data: { id, pickupDetails } });
    }
    const validated = UpdateListingStockSchema.parse(body);

    // Case 1: Status toggle (e.g. PUBLISHED <-> PAUSED)
    if (validated.status && validated.deltaQuantity === undefined && validated.totalQuantity === undefined) {
      const updated = await listingService.toggleListingStatus(
        merchant.id,
        id,
        validated.status as ListingStatus, session.userId
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
    }, session.userId);

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

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireMutationOrigin(request);
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

    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      session.userId,
      merchantId,
      'MANAGER'
    );

    // Archive / expire listing
    const updated = await listingService.toggleListingStatus(
      merchant.id,
      id,
      ListingStatus.EXPIRED, session.userId
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

export const PATCH = withDatabaseRequest(handlePATCH);
export const DELETE = withDatabaseRequest(handleDELETE);
