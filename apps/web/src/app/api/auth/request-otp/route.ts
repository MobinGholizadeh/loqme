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

    const { mobile, mode, audience, checkExists } = parseResult.data;
    const hasOptions = mode !== undefined || audience !== undefined || checkExists !== undefined;
    const result = hasOptions
      ? await authService.requestOtp(mobile, { mode, audience, checkExists })
      : await authService.requestOtp(mobile);

    if (!result.success) {
      const status = result.code === 'ACCOUNT_NOT_FOUND'
        ? 404
        : result.code === 'ACCOUNT_ALREADY_EXISTS'
        ? 409
        : result.cooldownSeconds
        ? 429
        : 503;
      return NextResponse.json(result, { status });
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
