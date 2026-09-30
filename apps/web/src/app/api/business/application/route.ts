import { NextRequest } from 'next/server';
import { getApplication, submitApplication } from '@/domain/business/application.service';
import { businessFailure, businessJson, businessUser, readBusinessBody } from '@/lib/business/http';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[LOGIN-TRACE][Server] GET /api/business/application');
    const user = await businessUser(request);
    return businessJson(await getApplication(user.id));
  } catch (e) {
    console.warn('[LOGIN-TRACE][Server] Error in GET /api/business/application', e);
    return businessFailure(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[LOGIN-TRACE][Server] POST /api/business/application received');
    const user = await businessUser(request);
    const body = await readBusinessBody(request);
    console.log('[LOGIN-TRACE][Server] Submitting business application for user', { userId: user.id });
    const result = await submitApplication(user.id, body);
    console.log('[LOGIN-TRACE][Server] Business application submitted successfully', { applicationId: result.id });
    return businessJson(result);
  } catch (e) {
    console.error('[LOGIN-TRACE][Server] Error in POST /api/business/application', e);
    return businessFailure(e);
  }
}
