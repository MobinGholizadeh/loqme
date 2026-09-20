import { NextRequest } from 'next/server';
import { getApplication, submitApplication } from '@/domain/business/application.service';
import { businessFailure, businessJson, businessUser, readBusinessBody } from '@/lib/business/http';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try { const user = await businessUser(request); return businessJson(await getApplication(user.id)); }
  catch (e) { return businessFailure(e); }
}
export async function POST(request: NextRequest) {
  try { const user = await businessUser(request); return businessJson(await submitApplication(user.id, await readBusinessBody(request))); }
  catch (e) { return businessFailure(e); }
}
