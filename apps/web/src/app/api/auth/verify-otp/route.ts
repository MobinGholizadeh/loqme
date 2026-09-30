import { NextRequest, NextResponse } from 'next/server';
import { VerifyOtpSchema } from '@loqme/validation';
import { authService } from '@/domain/auth/auth.service';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const xForwardedHost = request.headers.get('x-forwarded-host');
    const xForwardedProto = request.headers.get('x-forwarded-proto');
    const userAgent = request.headers.get('user-agent');

    console.log('[LOGIN-TRACE][Server] POST /api/auth/verify-otp received', {
      url: request.url,
      nextUrl: request.nextUrl.toString(),
      origin,
      host,
      xForwardedHost,
      xForwardedProto,
      userAgent: userAgent?.slice(0, 50),
    });

    const body = await request.json().catch((err) => {
      console.error('[LOGIN-TRACE][Server] Failed to parse JSON body in verify-otp', err);
      return null;
    });

    console.log('[LOGIN-TRACE][Server] Body received in verify-otp', {
      mobile: body?.mobile,
      hasCode: !!body?.code,
      codeLength: typeof body?.code === 'string' ? body.code.length : undefined,
    });

    const parseResult = VerifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'اطلاعات ارسالی نامعتبر است';
      console.warn('[LOGIN-TRACE][Server] Zod validation failed in verify-otp', {
        errors: parseResult.error.flatten(),
        errorMsg,
      });
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const { mobile, code } = parseResult.data;
    console.log('[LOGIN-TRACE][Server] Calling authService.verifyOtp', { mobile });
    const result = await authService.verifyOtp(mobile, code);

    console.log('[LOGIN-TRACE][Server] authService.verifyOtp returned', {
      success: result.success,
      message: result.message,
      hasUser: !!result.user,
      hasToken: !!result.token,
    });

    if (!result.success || !result.token) {
      console.warn('[LOGIN-TRACE][Server] verifyOtp rejected', { result });
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
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
    );

    console.log('[LOGIN-TRACE][Server] Setting session cookie', {
      name: SESSION_COOKIE_NAME,
      options: SESSION_COOKIE_OPTIONS,
      cookieDomain: request.nextUrl.hostname,
    });

    response.cookies.set(SESSION_COOKIE_NAME, result.token, {
      ...SESSION_COOKIE_OPTIONS,
    });

    console.log('[LOGIN-TRACE][Server] verify-otp completed successfully');
    return response;
  } catch (error) {
    console.error('[LOGIN-TRACE][Server] Uncaught error in verify-otp:', error);
    return NextResponse.json(
      { success: false, message: 'خطای سرور در تایید کد' },
      { status: 500 }
    );
  }
}
