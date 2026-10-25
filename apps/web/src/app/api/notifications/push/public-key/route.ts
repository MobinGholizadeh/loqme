import { NextResponse } from 'next/server';
import { getVapidKeys } from '@/domain/notification/webpush.config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { publicKey } = getVapidKeys();
  return NextResponse.json({
    success: true,
    publicKey,
  });
}
