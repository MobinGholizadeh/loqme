import { NextRequest, NextResponse } from 'next/server';
import { VerifyOtpSchema } from '@loqme/validation';
import { authService } from '@/domain/auth/auth.service';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = VerifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'اطلاعات ارسالی نامعتبر است';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const { mobile, code } = parseResult.data;
    const result = await authService.verifyOtp(mobile, code);

    if (!result.success || !result.token) {
      return NextResponse.json(result, { status: 400 });
    }

    // Set secure HttpOnly session cookie for Web, AND return token in JSON for Native Mobile
    const response = NextResponse.json(
      {
        success: true,
        message: result.message,
        user: result.user,
        token: result.token,
      },
      { status: 200 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, result.token, {
      ...SESSION_COOKIE_OPTIONS,
    });

    return response;
  } catch (error) {
    console.error('Error in verify-otp:', error);
    return NextResponse.json(
      { success: false, message: 'خطای سرور در تایید کد' },
      { status: 500 }
    );
  }
}
