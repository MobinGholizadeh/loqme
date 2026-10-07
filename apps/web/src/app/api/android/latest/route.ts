import { NextResponse } from 'next/server';
import { latestAndroidRelease } from '@/lib/android/releases';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json(await latestAndroidRelease(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'به‌روزرسانی در حال حاضر در دسترس نیست.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3600' },
    });
  }
}
