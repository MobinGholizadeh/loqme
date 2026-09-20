import { NextRequest } from 'next/server';
import { reviewApplication } from '@/domain/business/application.service';
import { businessFailure, businessJson, businessUser, readBusinessBody } from '@/lib/business/http';
export const dynamic = 'force-dynamic';
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try { const user = await businessUser(request); return businessJson(await reviewApplication(user.id, params.id, await readBusinessBody(request))); }
  catch (e) { return businessFailure(e); }
}
