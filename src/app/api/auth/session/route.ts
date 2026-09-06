import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const payload = await verifySessionToken(cookie.value);
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: payload.userId,
          mobile: payload.mobile,
          role: payload.role,
          fullName: payload.fullName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
