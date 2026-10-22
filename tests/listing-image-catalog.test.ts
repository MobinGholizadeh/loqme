import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  LISTING_IMAGE_CATALOG,
  getIllustrativeImagesForCategory,
  isIllustrativeImage,
} from '@/lib/listing-image-catalog';

describe('Listing Image Catalog & Category Mock Photos', () => {
  const CORE_CATEGORIES = [
    'bakery',
    'cafe',
    'restaurant',
    'supermarket',
    'produce',
    'deli',
  ] as const;

  it('defines exactly 3 mock images for every core category (18 total)', () => {
    expect(LISTING_IMAGE_CATALOG.length).toBe(18);

    for (const category of CORE_CATEGORIES) {
      const items = LISTING_IMAGE_CATALOG.filter((img) => img.categorySlug === category);
      expect(items.length, `Expected 3 mock images for category '${category}'`).toBe(3);
    }
  });

  it('verifies that each catalog image file exists on disk in apps/web/public', () => {
    const publicDir = path.resolve(process.cwd(), 'apps/web/public');

    for (const item of LISTING_IMAGE_CATALOG) {
      const relativePath = item.url.replace(/^\//, '');
      const fullPath = path.join(publicDir, relativePath);
      expect(
        fs.existsSync(fullPath),
        `Mock image file does not exist on disk: ${fullPath} (${item.label})`
      ).toBe(true);

      const stats = fs.statSync(fullPath);
      expect(stats.size).toBeGreaterThan(1000);
    }
  });

  it('filters mock images by category slug', () => {
    for (const category of CORE_CATEGORIES) {
      const result = getIllustrativeImagesForCategory(category);
      expect(result.length).toBe(3);
      expect(result.every((img) => img.categorySlug === category)).toBe(true);
    }
  });

  it('falls back to all images when category is unknown or "all"', () => {
    expect(getIllustrativeImagesForCategory('all').length).toBe(18);
    expect(getIllustrativeImagesForCategory('unknown-slug').length).toBe(18);
    expect(getIllustrativeImagesForCategory(null).length).toBe(18);
    expect(getIllustrativeImagesForCategory(undefined).length).toBe(18);
  });

  it('correctly identifies illustrative images', () => {
    for (const item of LISTING_IMAGE_CATALOG) {
      expect(isIllustrativeImage(item.url)).toBe(true);
    }
    expect(isIllustrativeImage('/listing-defaults/any-new-mock.png')).toBe(true);
    expect(isIllustrativeImage('/api/listing-images/123/user-photo.webp')).toBe(false);
    expect(isIllustrativeImage('')).toBe(false);
    expect(isIllustrativeImage(null)).toBe(false);
    expect(isIllustrativeImage(undefined)).toBe(false);
  });
});
