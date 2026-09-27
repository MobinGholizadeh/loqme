import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { listingService } from '@/domain/listing/listing.service';
import { merchantService } from '@/domain/merchant/merchant.service';
import { listingImageStorage } from '@/domain/listing/image-storage';
import { updateListingImage } from '@/domain/listing/update-image';
import { normalizeMapirPlaces } from '@/lib/business/mapir';
import { CreateListingSchema, CreateSurpriseBagSchema, FastCreateListingSchema } from '@loqme/validation';
import { GET as merchantDetail } from '@/app/api/merchants/[id]/route';
import { NextRequest } from 'next/server';

describe('business-only search', () => {
  it('rejects streets, cities, unknown POIs and businesses outside the chosen city', () => {
    const item = { title: 'کافه آرام', type: 'point', fclass: 'cafe', city: 'ارومیه', geom: { coordinates: [45.07, 37.55] } };
    const results = normalizeMapirPlaces({ value: [item, {...item, fclass: 'city'}, {...item, fclass: 'street'}, {...item, fclass: 'unknown'}, {...item, city: 'تهران'}, {...item, city: '', county: 'اروميه', title: 'کافه دیگر'}] }, 'ارومیه');
    expect(results.map(p => p.name)).toEqual(['کافه آرام', 'کافه دیگر']);
    expect(normalizeMapirPlaces({ value: [item, { ...item, title: 'کافه دیگر' }] }, 'ارومیه', 'آرام').map(p => p.name)).toEqual(['کافه آرام']);
  });
});
describe('required listing image contracts', () => {
  it.each([CreateListingSchema, CreateSurpriseBagSchema, FastCreateListingSchema])('rejects missing and blank image fields', schema => {
    for (const imageUrl of [undefined, '', '   ']) {
      const result = schema.safeParse({ imageUrl });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.some(i => i.path[0] === 'imageUrl')).toBe(true);
    }
  });
});
describe.skipIf(!process.env.DATABASE_URL?.includes('/loqme_onboarding_test'))('store cover and listing image persistence', () => {
  let ownerId: string; let merchantId: string; let otherMerchantId: string; let categoryId: string; let cover: string;
  const listingIds: string[] = [];
  beforeAll(async () => {
    ownerId = (await prisma.user.create({ data: { mobile: `cp16-${randomUUID()}`, role: 'MERCHANT_OWNER' } })).id;
    merchantId = (await prisma.merchant.create({ data: { ownerUserId: ownerId, businessNameFa: 'فروشگاه عکس', verificationStatus: 'APPROVED' } })).id;
    otherMerchantId = (await prisma.merchant.create({ data: { ownerUserId: ownerId, businessNameFa: 'فروشگاه دیگر' } })).id;
    categoryId = (await prisma.category.findFirstOrThrow()).id;
    cover = await listingImageStorage.save(merchantId, await sharp({ create: { width: 1800, height: 600, channels: 3, background: '#115e59' } }).webp().toBuffer());
  });
  afterAll(async () => {
    await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
    await prisma.merchant.deleteMany({ where: { id: { in: [merchantId, otherMerchantId] } } });
    await prisma.user.delete({ where: { id: ownerId } });
  });
  const input = () => ({ merchantId, categoryId, imageUrl: '/listing-defaults/bread.png', type: 'SURPRISE_BAG' as const, titleFa: 'بسته تازه آزمون', originalPriceToman: 100, discountedPriceToman: 50, quantity: 3, pickupDate: new Date(), pickupStart: new Date(), pickupEnd: new Date(Date.now()+3600000) });
  it('blocks publication until the owner supplies a cover; persists and returns the cover', async () => {
    await expect(listingService.createListing(input())).rejects.toThrow('عکس جلد');
    await expect(merchantService.updateStoreSettings(ownerId, { bannerImageUrl: '/listing-defaults/bread.png' }, merchantId)).rejects.toThrow('گالری');
    await expect(merchantService.updateStoreSettings(ownerId, { bannerImageUrl: cover }, otherMerchantId)).rejects.toThrow('گالری');
    await merchantService.updateStoreSettings(ownerId, { bannerImageUrl: cover }, merchantId);
    expect((await merchantService.getStoreSettings(ownerId, merchantId)).bannerImageUrl).toBe(cover);
    const response = await merchantDetail(new NextRequest(`http://localhost/api/merchants/${merchantId}`), { params: Promise.resolve({ id: merchantId }) });
    expect(response.status).toBe(200); expect((await response.json()).data.bannerImageUrl).toBe(cover);
  });
  it('creates a primary image and rejects missing or cross-store image input', async () => {
    await expect(listingService.createListing({ ...input(), imageUrl: '' })).rejects.toThrow();
    const listing = await listingService.createListing(input()); listingIds.push(listing.id);
    expect(await prisma.listingImage.count({ where: { listingId: listing.id, isPrimary: true } })).toBe(1);
    await expect(updateListingImage(otherMerchantId, listing.id, '/listing-defaults/meal.png')).rejects.toThrow('عدم دسترسی');
    await expect(updateListingImage(merchantId, listing.id, `/api/listing-images/${otherMerchantId}/${randomUUID()}.webp`)).rejects.toThrow('همین فروشگاه');
    await Promise.all(['/listing-defaults/meal.png', '/listing-defaults/produce.png'].map(url => updateListingImage(merchantId, listing.id, url)));
    expect(await prisma.listingImage.count({ where: { listingId: listing.id, isPrimary: true } })).toBe(1);
  });
  it('lets legacy offers receive a photo before resuming, without deleting records', async () => {
    const listing = await listingService.createListing(input()); listingIds.push(listing.id);
    await prisma.listingImage.deleteMany({ where: { listingId: listing.id } });
    await listingService.toggleListingStatus(merchantId, listing.id, 'PAUSED');
    await expect(listingService.toggleListingStatus(merchantId, listing.id, 'PUBLISHED')).rejects.toThrow('تصویر');
    await updateListingImage(merchantId, listing.id, '/listing-defaults/bread.png');
    expect((await listingService.toggleListingStatus(merchantId, listing.id, 'PUBLISHED')).status).toBe('PUBLISHED');
  });
});
