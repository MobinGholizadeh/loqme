import { NextRequest, NextResponse } from 'next/server';
import { moderationService } from '@/domain/moderation/moderation.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { MerchantReplyReviewSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json();
    const parseResult = MerchantReplyReviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'متن پاسخ نامعتبر است',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updated = await moderationService.replyToReview(
      payload.userId,
      params.id,
      parseResult.data.replyFa
    );

    return NextResponse.json({
      success: true,
      message: 'پاسخ شما با موفقیت ثبت شد',
      review: updated,
    });
  } catch (error: any) {
    console.error('Error replying to review:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ثبت پاسخ به نظر' },
      { status: 400 }
    );
  }
}
