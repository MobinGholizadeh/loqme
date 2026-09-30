import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = extractSessionToken(request);
    console.log('[LOGIN-TRACE][Server] GET /api/auth/session received', {
      hasCookieHeader: !!cookieHeader,
      hasToken: !!token,
      url: request.url,
    });

    if (!token) {
      console.log('[LOGIN-TRACE][Server] /api/auth/session: No session token found in request');
      return NextResponse.json({ authenticated: false, user: null }, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      console.warn('[LOGIN-TRACE][Server] /api/auth/session: Session token verification failed (invalid or expired token)');
      return NextResponse.json({ authenticated: false, user: null }, { status: 200, headers: { 'Cache-Control': 'private, no-store' } });
    }

    console.log('[LOGIN-TRACE][Server] /api/auth/session: Token verified for userId', {
      userId: payload.userId,
      role: payload.role,
    });

    const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { customer: { select: { fullName: true } } } });
    if (!user) {
      console.warn('[LOGIN-TRACE][Server] /api/auth/session: User ID in token not found in database', { userId: payload.userId });
      return NextResponse.json({ authenticated: false, user: null }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (!user.isActive) {
      console.warn('[LOGIN-TRACE][Server] /api/auth/session: User is inactive', { userId: payload.userId });
      return NextResponse.json({ authenticated: false, user: null }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    console.log('[LOGIN-TRACE][Server] /api/auth/session: Session successfully resolved', {
      userId: user.id,
      role: user.role,
      mobile: user.mobile,
    });

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: payload.userId,
          mobile: user.mobile,
          role: user.role,
          fullName: user.customer?.fullName || payload.fullName,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[LOGIN-TRACE][Server] Error fetching session:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
