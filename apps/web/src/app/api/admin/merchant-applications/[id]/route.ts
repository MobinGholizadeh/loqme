import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest } from 'next/server';
import { reviewApplication } from '@/domain/business/application.service';
import { businessFailure, businessJson, businessUser, readBusinessBody } from '@/lib/business/http';
export const dynamic = 'force-dynamic';
async function handlePATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await businessUser(request);
    return businessJson(await reviewApplication(user.id, id, await readBusinessBody(request)));
  } catch (e) {
    return businessFailure(e);
  }
}

export const PATCH = withDatabaseRequest(handlePATCH);
