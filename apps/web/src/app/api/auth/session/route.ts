import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { customer: { select: { fullName: true } } } });
    if (!user?.isActive) return NextResponse.json({ authenticated: false, user: null }, { headers: { 'Cache-Control': 'private, no-store' } });

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
    console.error('Error fetching session:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
