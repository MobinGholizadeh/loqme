import { NextRequest, NextResponse } from 'next/server';
import { RequestOtpSchema } from '@/domain/auth/auth.schema';
import { authService } from '@/domain/auth/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = RequestOtpSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'اطلاعات ارسالی نامعتبر است';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const result = await authService.requestOtp(parseResult.data.mobile);

    if (!result.success) {
      return NextResponse.json(result, { status: 429 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in request-otp:', error);
    return NextResponse.json(
      { success: false, message: 'خطای سرور در ارسال کد تایید' },
      { status: 500 }
    );
  }
}
