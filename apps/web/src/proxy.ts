import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { canAccessPath, UserRole } from '@loqme/types';

function privateResponse(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve session token from Bearer header or cookie
  const token = extractSessionToken(request);
  let userRole: UserRole | null = null;

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      userRole = payload.role;
    }
  }

  // Check RBAC permission for route
  const isAllowed = canAccessPath(userRole, pathname);

  if (!isAllowed) {
    // If request is an API call, return JSON 401/403 rather than HTML redirect
    if (pathname.startsWith('/api/')) {
      return privateResponse(NextResponse.json(
        {
          success: false,
          message: userRole ? 'شما مجوز دسترسی به این بخش را ندارید' : 'لطفاً ابتدا وارد حساب کاربری شوید',
        },
        { status: userRole ? 403 : 401 }
      ));
    }

    // If not authenticated at all, redirect to login with return URL
    if (!userRole) {
      const loginUrl = new URL(pathname === '/merchant' || pathname.startsWith('/merchant/') ? '/business/login' : '/login', request.url);
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
      return privateResponse(NextResponse.redirect(loginUrl));
    }

    // If authenticated but role lacks authorization
    const unauthorizedUrl = new URL(userRole === 'ADMIN' ? '/admin' : '/', request.url);
    return privateResponse(NextResponse.redirect(unauthorizedUrl));
  }

  return privateResponse(NextResponse.next());
}

export const middleware = proxy;

export const config = {
  matcher: [
    '/merchant/:path*',
    '/admin/:path*',
    '/orders/:path*',
    '/profile/:path*',
  ],
};
