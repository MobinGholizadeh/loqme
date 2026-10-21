import { NextRequest } from 'next/server';
import { readBoundedBody } from '@/lib/business/bounded-body';
export function requireMutationOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return; // Native bearer clients do not send browser Origin.
  const origins = new Set([request.nextUrl.origin]);
  if (process.env.NEXT_PUBLIC_APP_URL) origins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
  if (!origins.has(origin)) throw new Error('عدم دسترسی: مبدأ درخواست معتبر نیست');
}
export async function readMerchantJson(request: NextRequest) {
  requireMutationOrigin(request);
  return JSON.parse(await readBoundedBody(request.body, 32_768));
}

export function extractMerchantId(request: NextRequest, fallbackMerchantId?: string): string | undefined {
  return request.nextUrl.searchParams.get('merchantId') || fallbackMerchantId || request.cookies.get('loqme_active_merchant')?.value || undefined;
}


