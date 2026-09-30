import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { BusinessError, requireActiveAccount } from '@/domain/business/application.service';
import { readBoundedBody } from './bounded-body';

export const businessJson = (data: unknown, status = 200) => NextResponse.json({ success: true, data }, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function businessUser(request: NextRequest) {
  const token = extractSessionToken(request);
  const session = token ? await verifySessionToken(token) : null;
  console.log('[LOGIN-TRACE][Server] businessUser auth check', {
    hasToken: !!token,
    hasSession: !!session,
    userId: session?.userId,
  });
  if (!session) {
    console.warn('[LOGIN-TRACE][Server] businessUser: unauthenticated request');
    throw new BusinessError(401, 'لطفاً ابتدا وارد حساب شوید');
  }
  return requireActiveAccount(session.userId);
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return;

  const origins = new Set<string>();

  // 1. Direct Next.js URL origin
  if (request.nextUrl.origin) {
    origins.add(request.nextUrl.origin.toLowerCase());
  }

  // 2. Forwarded Host & Proto from reverse proxies (Nginx, Caddy, Cloudflare, Docker)
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'https');
  if (forwardedHost) {
    origins.add(`${forwardedProto}://${forwardedHost}`.toLowerCase());
    origins.add(`https://${forwardedHost}`.toLowerCase());
    origins.add(`http://${forwardedHost}`.toLowerCase());
  }

  // 3. Host header
  const host = request.headers.get('host');
  if (host) {
    origins.add(`https://${host}`.toLowerCase());
    origins.add(`http://${host}`.toLowerCase());
  }

  // 4. Configured APP_URL if present
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      origins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin.toLowerCase());
    } catch {}
  }

  const normalizedOrigin = origin.toLowerCase();
  const isAllowed = origins.has(normalizedOrigin);

  console.log('[LOGIN-TRACE][Server] sameOrigin check', {
    origin: normalizedOrigin,
    allowedOrigins: Array.from(origins),
    isAllowed,
  });

  if (!isAllowed) {
    console.error('[LOGIN-TRACE][Server] sameOrigin MISMATCH DETECTED -> Throwing 403 "درخواست نامعتبر است"', {
      origin: normalizedOrigin,
      allowedOrigins: Array.from(origins),
    });
    throw new BusinessError(403, 'درخواست نامعتبر است');
  }
}

export async function readBusinessBody(request: NextRequest) {
  sameOrigin(request);
  let text: string;
  try {
    text = await readBoundedBody(request.body, 32000);
  } catch (error) {
    if (error instanceof RangeError) {
      console.warn('[LOGIN-TRACE][Server] readBusinessBody: payload too large');
      throw new BusinessError(413, 'حجم درخواست بیش از حد مجاز است');
    }
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    console.warn('[LOGIN-TRACE][Server] readBusinessBody: invalid JSON in body', parseErr);
    throw new BusinessError(400, 'اطلاعات ارسالی نامعتبر است');
  }
}

export function businessFailure(error: unknown) {
  const status = error instanceof BusinessError ? error.status : error instanceof ZodError ? 400 : 500;
  const message = error instanceof BusinessError ? error.message : error instanceof ZodError ? error.issues[0]?.message : 'دریافت یا ذخیره اطلاعات ممکن نشد؛ دوباره تلاش کنید';
  console.warn('[LOGIN-TRACE][Server] businessFailure returned to client', {
    status,
    message,
    isBusinessError: error instanceof BusinessError,
    isZodError: error instanceof ZodError,
  });
  return NextResponse.json({ success: false, message, ...(error instanceof ZodError ? { details: error.flatten().fieldErrors } : {}) }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
