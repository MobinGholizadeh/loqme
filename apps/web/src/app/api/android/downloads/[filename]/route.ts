import { androidDownload } from '@/lib/android/releases';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  return androidDownload(request, (await context.params).filename);
}

export const HEAD = GET;
