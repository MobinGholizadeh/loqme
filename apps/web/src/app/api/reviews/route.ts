import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { moderationService } from '@/domain/moderation/moderation.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { CreateReviewSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const limit = Number(searchParams.get('limit')) || 20;
    const offset = Number(searchParams.get('offset')) || 0;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, message: 'شناسه فروشگاه الزامی است' },
        { status: 400 }
      );
    }

    const result = await moderationService.listMerchantReviews(merchantId, limit, offset);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error fetching merchant reviews:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت لیست نظرات' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: payload.userId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'پروفایل مشتری یافت نشد' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parseResult = CreateReviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'داده‌های ورودی نامعتبر است',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const review = await moderationService.submitReview(
      customer.id,
      parseResult.data.orderId,
      parseResult.data
    );

    return NextResponse.json({
      success: true,
      message: 'نظر شما با موفقیت ثبت شد',
      review,
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ثبت نظر' },
      { status: 400 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const POST = withDatabaseRequest(handlePOST);
