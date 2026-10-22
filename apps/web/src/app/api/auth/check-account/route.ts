import { NextResponse } from 'next/server';

// Use the throttled OTP flow; never expose roles, active flags or phone lookups.
function retired() {
  return NextResponse.json({ success: false, message: 'برای ورود یا ثبت‌نام از فرم حساب کاربری استفاده کنید' },
    { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
}
export const GET = retired;
export const POST = retired;
