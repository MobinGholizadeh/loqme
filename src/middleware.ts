import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';
import { canAccessPath } from '@/lib/auth/rbac';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve session cookie
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  let userRole: 'CUSTOMER' | 'MERCHANT_STAFF' | 'MERCHANT_OWNER' | 'ADMIN' | null = null;

  if (cookie?.value) {
    const payload = await verifySessionToken(cookie.value);
    if (payload) {
      userRole = payload.role;
    }
  }

  // Check RBAC permission for route
  const isAllowed = canAccessPath(userRole, pathname);

  if (!isAllowed) {
    // If not authenticated at all, redirect to login with return URL
    if (!userRole) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If authenticated but role lacks authorization (e.g. CUSTOMER trying to enter /merchant or /admin)
    const unauthorizedUrl = new URL('/login', request.url);
    unauthorizedUrl.searchParams.set('unauthorized', '1');
    unauthorizedUrl.searchParams.set('role', userRole);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/merchant/:path*',
    '/admin/:path*',
    '/orders/:path*',
    '/profile/:path*',
  ],
};
