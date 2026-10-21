import { withDatabaseRequest } from '@/lib/db/request';
import { androidDownload } from '@/lib/android/releases';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleGET(request: Request, context: { params: Promise<{ filename: string }> }) {
  return androidDownload(request, (await context.params).filename);
}

export const GET = withDatabaseRequest(handleGET);

export const HEAD = GET;

