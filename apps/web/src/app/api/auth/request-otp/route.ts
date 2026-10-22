import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { RequestOtpSchema } from '@/domain/auth/auth.schema';
import { guardOtpRequest } from '@/lib/auth/request-guard';
import { readBoundedBody } from '@/lib/business/bounded-body';
import { authService } from '@/domain/auth/auth.service';

function authJson(data: unknown, init: { status: number }) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'private, no-store' } });
}

async function handlePOST(request: NextRequest) {
  const blocked = guardOtpRequest(request);
  if (blocked) return blocked;
  try {
    const body = JSON.parse(await readBoundedBody(request.body, 4096));
    const parseResult = RequestOtpSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'اطلاعات ارسالی نامعتبر است';
      return authJson({ success: false, message: errorMsg }, { status: 400 });
    }

    const { mobile, mode, audience, checkExists } = parseResult.data;
    const hasOptions = mode !== undefined || audience !== undefined || checkExists !== undefined;
    const result = hasOptions
      ? await authService.requestOtp(mobile, { mode, audience, checkExists })
      : await authService.requestOtp(mobile);

    if (!result.success) {
      const status = result.code === 'ACCOUNT_NOT_FOUND'
        ? 404
        : result.code === 'ACCOUNT_UNAVAILABLE'
        ? 403
        : result.code === 'ACCOUNT_ALREADY_EXISTS'
        ? 409
        : result.cooldownSeconds
        ? 429
        : 503;
      return authJson(result, { status });
    }

    return authJson(result, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) {
      return authJson({ success: false, message: 'اطلاعات ارسالی نامعتبر است' }, { status: error instanceof RangeError ? 413 : 400 });
    }
    console.error('[Auth] OTP request failed');
    return authJson(
      { success: false, message: 'خطای سرور در ارسال کد تایید' },
      { status: 500 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
