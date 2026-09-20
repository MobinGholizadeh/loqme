import { NextRequest } from 'next/server';
import { listApplications } from '@/domain/business/application.service';
import { businessFailure, businessJson, businessUser } from '@/lib/business/http';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try { const user = await businessUser(request); const page = Math.max(1, Math.min(10000, Number(request.nextUrl.searchParams.get('page')) || 1)); return businessJson(await listApplications(user.id, Math.floor(page))); }
  catch (e) { return businessFailure(e); }
}
