import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { supportService } from '@/domain/support/support.service';
import { extractMerchantId } from '@/lib/http/merchant-http';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json({ success: true, data: { unreadCount: 0 } });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ success: true, data: { unreadCount: 0 } });
    }

    const merchantId = extractMerchantId(request);
    const result = await supportService.getUnreadBadgeCounts(
      session.userId,
      session.role as any,
      merchantId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in GET /api/support/badge:', error);
    return NextResponse.json({ success: true, data: { unreadCount: 0 } });
  }
}

export const GET = withDatabaseRequest(handleGET);
