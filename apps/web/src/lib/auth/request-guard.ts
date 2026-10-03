import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const attempts = new Map<string, { count: number; expires: number }>();
const WINDOW = 10 * 60 * 1000;

export function guardOtpRequest(request: NextRequest) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ success: false, message: 'درخواست نامعتبر است.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
  // The production proxy overwrites X-Real-IP; keep the app port private.
  // Missing IPs share a restrictive bucket instead of bypassing throttling.
  const key = createHash('sha256').update(request.headers.get('x-real-ip') || 'unknown').digest('hex');
  const now = Date.now();
  for (const [id, value] of Array.from(attempts.entries())) if (value.expires <= now) attempts.delete(id);
  const bucket = attempts.get(key) || { count: 0, expires: now + WINDOW };
  if (bucket.count >= 10 || (!attempts.has(key) && attempts.size >= 10000)) {
    const seconds = Math.max(1, Math.ceil((bucket.expires - now) / 1000));
    return NextResponse.json({ success: false, message: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.', cooldownSeconds: seconds },
      { status: 429, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': String(seconds) } });
  }
  bucket.count++;
  attempts.set(key, bucket);
  return null;
}
