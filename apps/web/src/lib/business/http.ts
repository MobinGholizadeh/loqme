import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { BusinessError, requireActiveAccount } from '@/domain/business/application.service';
import { readBoundedBody } from './bounded-body';

export const businessJson = (data: unknown, status = 200) => NextResponse.json({ success: true, data }, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function businessUser(request: NextRequest) {
  const token = extractSessionToken(request);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) throw new BusinessError(401, 'لطفاً ابتدا وارد حساب شوید');
  return requireActiveAccount(session.userId);
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) throw new BusinessError(403, 'درخواست نامعتبر است');
}
export async function readBusinessBody(request: NextRequest) {
  sameOrigin(request);
  let text: string;
  try { text = await readBoundedBody(request.body, 32000); }
  catch (error) { if (error instanceof RangeError) throw new BusinessError(413, 'حجم درخواست بیش از حد مجاز است'); throw error; }
  try { return JSON.parse(text); } catch { throw new BusinessError(400, 'اطلاعات ارسالی نامعتبر است'); }
}
export function businessFailure(error: unknown) {
  const status = error instanceof BusinessError ? error.status : error instanceof ZodError ? 400 : 500;
  const message = error instanceof BusinessError ? error.message : error instanceof ZodError ? error.issues[0]?.message : 'دریافت یا ذخیره اطلاعات ممکن نشد؛ دوباره تلاش کنید';
  return NextResponse.json({ success: false, message, ...(error instanceof ZodError ? { details: error.flatten().fieldErrors } : {}) }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
