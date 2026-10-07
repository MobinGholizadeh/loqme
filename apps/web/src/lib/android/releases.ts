import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { z } from 'zod';

const releaseSchema = z.object({
  versionCode: z.number().int().positive().max(2100000000),
  versionName: z.string().regex(/^\d+\.\d+\.\d+$/),
  minSdk: z.number().int().min(21),
  apkUrl: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
}).refine(value => value.apkUrl === `https://loqme.shop/api/android/downloads/loqme-v${value.versionCode}.apk`);

export function releaseDirectory() {
  return process.env.ANDROID_RELEASE_STORAGE_DIR || path.resolve(process.cwd(), '.data/android-releases');
}

export async function latestAndroidRelease() {
  const filename = path.join(releaseDirectory(), 'latest.json');
  if ((await stat(filename)).size > 8192) throw new Error('Oversized release metadata');
  const release = releaseSchema.parse(JSON.parse(await readFile(filename, 'utf8')));
  const apk = await stat(path.join(releaseDirectory(), `loqme-v${release.versionCode}.apk`));
  if (!apk.isFile() || apk.size === 0) throw new Error('Release APK unavailable');
  return release;
}

export async function androidDownload(request: Request, filename: string) {
  if (!/^loqme-v[1-9]\d{0,9}\.apk$/.test(filename)) return new Response(null, { status: 404 });
  const target = path.join(releaseDirectory(), filename);
  let size: number;
  try {
    const file = await stat(target);
    if (!file.isFile() || !file.size) return new Response(null, { status: 404 });
    size = file.size;
  } catch { return new Response(null, { status: 404 }); }
  const headers = new Headers({
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  });
  let start = 0, end = size - 1;
  const range = request.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  }
  headers.set('Content-Length', String(end - start + 1));
  const body = request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(target, { start, end })) as ReadableStream;
  return new Response(body, { status: range ? 206 : 200, headers });
}
