import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { GET } from '@/app/api/android/latest/route';
import { androidDownload } from '@/lib/android/releases';

let directory: string;
const release = {
  versionCode: 200, versionName: '1.1.200', minSdk: 21,
  apkUrl: 'https://loqme.shop/api/android/downloads/loqme-v200.apk',
  sha256: 'a'.repeat(64), sourceCommit: 'b'.repeat(40), deploymentRunNumber: 9,
};
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'loqme-android-test-'));
  vi.stubEnv('ANDROID_RELEASE_STORAGE_DIR', directory);
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
async function seed(metadata: unknown = release) {
  await writeFile(path.join(directory, 'latest.json'), JSON.stringify(metadata));
  await writeFile(path.join(directory, 'loqme-v200.apk'), Buffer.from('test-apk-content'));
}

describe('public Android update distribution', () => {
  it('serves published metadata anonymously without caching deployment state', async () => {
    await seed(); const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ versionCode: 200, versionName: '1.1.200', minSdk: 21,
      apkUrl: release.apkUrl, sha256: release.sha256, sourceCommit: release.sourceCommit });
  });
  it.each(['missing', 'malformed', 'wrong-origin', 'missing-apk', 'oversized'])('fails closed for %s releases', async kind => {
    if (kind !== 'missing') await seed();
    if (kind === 'malformed') await writeFile(path.join(directory, 'latest.json'), '{');
    if (kind === 'oversized') await writeFile(path.join(directory, 'latest.json'), ' '.repeat(8193));
    if (kind === 'wrong-origin') await seed({ ...release, apkUrl: 'https://evil.example/app.apk' });
    if (kind === 'missing-apk') await rm(path.join(directory, 'loqme-v200.apk'));
    const response = await GET(); expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(directory);
  });
  it('streams an APK and supports resumable ranges and HEAD', async () => {
    await seed(); const url = 'https://loqme.shop/api/android/downloads/loqme-v200.apk';
    const full = await androidDownload(new Request(url), 'loqme-v200.apk');
    expect(full.status).toBe(200); expect(await full.text()).toBe('test-apk-content');
    expect(full.headers.get('content-type')).toBe('application/vnd.android.package-archive');
    const part = await androidDownload(new Request(url, { headers: { range: 'bytes=5-7' } }), 'loqme-v200.apk');
    expect(part.status).toBe(206); expect(await part.text()).toBe('apk');
    const suffix = await androidDownload(new Request(url, { headers: { range: 'bytes=-7' } }), 'loqme-v200.apk');
    expect(await suffix.text()).toBe('content');
    const head = await androidDownload(new Request(url, { method: 'HEAD' }), 'loqme-v200.apk');
    expect(head.headers.get('content-length')).toBe('16'); expect(await head.text()).toBe('');
  });
  it.each(['bytes=99-', 'bytes=5-2', 'bytes=-0', 'bytes=0-2,4-6', 'invalid'])('rejects invalid range %s', async range => {
    await seed(); expect((await androidDownload(new Request('https://loqme.shop', { headers: { range } }), 'loqme-v200.apk')).status).toBe(416);
  });
  it.each(['../latest.json', 'latest.json', 'loqme-v0.apk', 'loqme-v999.apk'])('rejects inaccessible download %s', async filename => {
    await seed(); expect((await androidDownload(new Request('https://loqme.shop'), filename)).status).toBe(404);
  });
});
