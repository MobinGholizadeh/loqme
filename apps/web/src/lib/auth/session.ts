import { SignJWT, jwtVerify } from 'jose';
import { UserRole, SessionPayload } from '@loqme/types';

export const SESSION_COOKIE_NAME = 'loqme_session';

export type { SessionPayload };

const getSecretKey = () => {
  const secret = process.env.SESSION_SECRET || 'loqme-development-session-super-secret-key-change-in-production-32c';
  return new TextEncoder().encode(secret);
};

/**
 * Creates an edge-compatible signed JWT session token
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
}

/**
 * Verifies a signed session token and returns the decoded payload, or null if invalid/expired
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });

    if (!payload.userId || !payload.mobile || !payload.role) {
      return null;
    }

    return {
      userId: payload.userId as string,
      mobile: payload.mobile as string,
      role: payload.role as UserRole,
      fullName: (payload.fullName as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Cookie options for secure HttpOnly cookie persistence
 */
export const SESSION_COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days
};

/**
 * Extracts session token from either Authorization header (Bearer <token>)
 * or HttpOnly cookie (loqme_session).
 * Enables universal authentication for both Web (cookies) and Native Mobile (Bearer tokens).
 */
export function extractSessionToken(request: {
  headers: Headers | { get(name: string): string | null };
  cookies?: { get(name: string): { value?: string } | undefined };
}): string | null {
  // 1. Check Authorization header (Mobile or API client standard)
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  // 2. Fall back to Cookie (Web standard)
  if (request.cookies && typeof request.cookies.get === 'function') {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (cookie?.value) {
      return cookie.value;
    }
  }

  return null;
}
