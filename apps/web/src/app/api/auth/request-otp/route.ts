import { NextRequest, NextResponse } from 'next/server';
import { RequestOtpSchema } from '@/domain/auth/auth.schema';
import { authService } from '@/domain/auth/auth.service';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    console.log('[LOGIN-TRACE][Server] POST /api/auth/request-otp received', {
      url: request.url,
      origin,
      host,
    });

    const body = await request.json().catch((err) => {
      console.error('[LOGIN-TRACE][Server] Failed to parse JSON body in request-otp', err);
      return null;
    });

    console.log('[LOGIN-TRACE][Server] Request body in request-otp', { mobile: body?.mobile });
    const parseResult = RequestOtpSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'اطلاعات ارسالی نامعتبر است';
      console.warn('[LOGIN-TRACE][Server] Zod validation failed in request-otp', {
        errors: parseResult.error.flatten(),
        errorMsg,
      });
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    console.log('[LOGIN-TRACE][Server] Requesting OTP for mobile:', parseResult.data.mobile);
    const result = await authService.requestOtp(parseResult.data.mobile);

    console.log('[LOGIN-TRACE][Server] authService.requestOtp result:', {
      success: result.success,
      message: result.message,
      expiresInSeconds: result.expiresInSeconds,
      cooldownSeconds: result.cooldownSeconds,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: result.cooldownSeconds ? 429 : 503 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[LOGIN-TRACE][Server] Error in request-otp:', error);
    return NextResponse.json(
      { success: false, message: 'خطای سرور در ارسال کد تایید' },
      { status: 500 }
    );
  }
}
