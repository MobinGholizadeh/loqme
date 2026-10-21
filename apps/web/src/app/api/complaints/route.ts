import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { moderationService } from '@/domain/moderation/moderation.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { CreateComplaintSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

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
    const parseResult = CreateComplaintSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'اطلاعات ثبت گزارش نامعتبر است',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const complaint = await moderationService.submitComplaint(
      customer.id,
      parseResult.data.orderId,
      parseResult.data
    );

    return NextResponse.json({
      success: true,
      message: 'گزارش شما با موفقیت ثبت شد و توسط تیم پشتیبانی بررسی خواهد شد',
      complaint,
    });
  } catch (error: any) {
    console.error('Error submitting complaint:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ثبت شکایت' },
      { status: 400 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
