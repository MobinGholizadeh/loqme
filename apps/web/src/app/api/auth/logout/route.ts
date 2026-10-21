import { withDatabaseRequest } from '@/lib/db/request';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

async function handlePOST() {
  const response = NextResponse.json(
    { success: true, message: 'با موفقیت خارج شدید' },
    { status: 200 }
  );

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}

export const POST = withDatabaseRequest(handlePOST);
