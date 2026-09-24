import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { normalizeListingImage } from '@/domain/listing/image-storage';
import { env } from '@/core/config';
import { getNotificationService, resetNotificationService } from '@/lib/notifications';

const original = { ...env };
afterEach(() => { Object.assign(env, original); resetNotificationService(); vi.restoreAllMocks(); });

describe('CP10.15 delivery and image regressions', () => {
  it.each(['console', 'smsir'] as const)('does not issue mock SMS in production with %s', async provider => {
    Object.assign(env, { NODE_ENV: 'production', SMS_PROVIDER: provider, SMSIR_API_KEY: '' });
    resetNotificationService();
    const log = vi.spyOn(console, 'log');
    expect(await getNotificationService().sendOtp('09120000000', '12345')).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });
  it('retains 2400px detail for high-density photos with compressed, stripped output', async () => {
    const input = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#135e66' } })
      .withMetadata({ exif: { IFD0: { Copyright: 'test-only' } } }).png().toBuffer();
    const output = await normalizeListingImage(input);
    const metadata = await sharp(output).metadata();
    expect(metadata).toMatchObject({ format: 'webp', width: 2400, height: 1600 });
    expect(metadata.exif).toBeUndefined(); expect(output.length).toBeLessThan(input.length);
  });
  it('preserves aspect ratio without stretching small originals', async () => {
    const input = await sharp({ create: { width: 200, height: 100, channels: 3, background: 'teal' } }).png().toBuffer();
    expect(await sharp(await normalizeListingImage(input)).metadata()).toMatchObject({ width: 200, height: 100 });
  });
});
