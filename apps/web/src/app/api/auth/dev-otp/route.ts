import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { ConsoleMockNotificationService } from '@/lib/notifications/console-mock';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  // Only accessible in non-production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mobile = searchParams.get('mobile');

  if (mobile) {
    const record = ConsoleMockNotificationService.getRecentOtp(mobile);
    return NextResponse.json({ record: record || null });
  }

  return NextResponse.json({ records: ConsoleMockNotificationService.getAllRecentOtps() });
}

export const GET = withDatabaseRequest(handleGET);
