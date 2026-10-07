import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const attempts = new Map<string, { count: number; expires: number }>();
const WINDOW = 10 * 60 * 1000;

export function isValidOrigin(request: NextRequest): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return false;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.toLowerCase().replace(/\/+$/, '');
  const allowed = new Set<string>();

  // 1. Direct Next.js URL origin
  if (request.nextUrl.origin) {
    allowed.add(request.nextUrl.origin.toLowerCase().replace(/\/+$/, ''));
  }

  // 2. Forwarded Host & Proto from reverse proxies (Nginx, Caddy, Cloudflare, Docker)
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'https');
  if (forwardedHost) {
    allowed.add(`${forwardedProto}://${forwardedHost}`.toLowerCase().replace(/\/+$/, ''));
    allowed.add(`https://${forwardedHost}`.toLowerCase().replace(/\/+$/, ''));
    allowed.add(`http://${forwardedHost}`.toLowerCase().replace(/\/+$/, ''));
    const hostName = forwardedHost.split(':')[0];
    if (hostName) {
      allowed.add(`https://${hostName}`.toLowerCase());
      allowed.add(`http://${hostName}`.toLowerCase());
    }
  }

  // 3. Host header
  const host = request.headers.get('host');
  if (host) {
    allowed.add(`https://${host}`.toLowerCase().replace(/\/+$/, ''));
    allowed.add(`http://${host}`.toLowerCase().replace(/\/+$/, ''));
    const hostName = host.split(':')[0];
    if (hostName) {
      allowed.add(`https://${hostName}`.toLowerCase());
      allowed.add(`http://${hostName}`.toLowerCase());
    }
  }

  // 4. Configured APP_URL if present
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      allowed.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin.toLowerCase().replace(/\/+$/, ''));
    } catch {}
  }

  // 5. Official Loqme domains
  allowed.add('https://loqme.shop');
  allowed.add('https://www.loqme.shop');

  return allowed.has(normalizedOrigin);
}

export function guardOtpRequest(request: NextRequest) {
  if (!isValidOrigin(request)) {
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
