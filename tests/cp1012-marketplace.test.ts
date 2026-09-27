import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { moderationService } from '@/domain/moderation/moderation.service';
import { inventoryService } from '@/domain/inventory/inventory.service';
import { reservationService } from '@/domain/reservation/reservation.service';
import { listingService } from '@/domain/listing/listing.service';
import { listingAvailability } from '@/domain/listing/availability';
import { CreateReviewSchema } from '@loqme/validation';
import { GET as nearby } from '@/app/api/listings/nearby/route';
import { GET as search } from '@/app/api/listings/search/route';
import { GET as merchantDetail } from '@/app/api/merchants/[id]/route';

const isolated = /\/loqme_(cp1012|onboarding)_test/.test(new URL(process.env.DATABASE_URL || 'postgresql://localhost/none').pathname)
  || process.env.DATABASE_URL?.includes('/loqme_cp1012_acceptance_');
describe('CP10.12 review validation', () => {
  it('accepts legacy aliases without inventing missing scores', () => {
    const value = CreateReviewSchema.parse({ orderId: 'o', ratingScore: 3 });
    expect(value.overallRating).toBe(3); expect(value.qualityRating).toBeUndefined();
    expect(value.valueRating).toBeUndefined(); expect(value.collectionRating).toBeUndefined();
  });
  it.each(['collectionRating', 'varietyRating', 'quantityRating'])('rejects invalid %s', key => {
    for (const value of [0, 6, 2.5, '5', null]) {
      expect(CreateReviewSchema.safeParse({ orderId: 'o', overallRating: 4, [key]: value }).success).toBe(false);
    }
  });
});
describe.skipIf(!isolated)('CP10.12 real database acceptance', () => {
  let merchantId: string; let customerId: string; let userId: string; let categoryId: string;
  const run = randomUUID(); const listingIds: string[] = [];
  beforeAll(async () => {
    const user = await prisma.user.create({ data: { mobile: `cp12-${run}`, role: 'CUSTOMER', customer: { create: {} } }, include: { customer: true } });
    userId = user.id; customerId = user.customer!.id;
    merchantId = (await prisma.merchant.create({ data: { ownerUserId: userId, businessNameFa: `آزمون ${run}`, verificationStatus: 'APPROVED', bannerImageUrl: '/test-cover.webp' } })).id;
    categoryId = (await prisma.category.findFirstOrThrow()).id;
  });
  afterAll(async () => {
    await prisma.review.deleteMany({ where: { merchantId } });
    await prisma.order.deleteMany({ where: { merchantId } });
    await prisma.reservation.deleteMany({ where: { listingId: { in: listingIds } } });
    await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
    await prisma.merchant.delete({ where: { id: merchantId } });
    await prisma.user.delete({ where: { id: userId } });
  });
  async function order() {
    return prisma.order.create({ data: { orderNumber: randomUUID(), merchantId, customerId, status: 'COMPLETED', totalAmountToman: 100 } });
  }
  async function listing(quantity = 2) {
    const value = await listingService.createListing({ imageUrl: '/listing-defaults/bread.png', merchantId, categoryId, type: 'SURPRISE_BAG', titleFa: `بسته آزمون ${run}`, descriptionFa: 'بسته آزمون ایزوله', originalPriceToman: 100, discountedPriceToman: 50, quantity,
      pickupDate: new Date().toISOString(), pickupStart: new Date().toISOString(), pickupEnd: new Date(Date.now() + 3600000).toISOString(), allergens: [], dietaryTags: [], temperatureRequirement: 'ROOM_TEMP' });
    listingIds.push(value.id); return value;
  }
  async function snapshot(id: string) { return prisma.listing.findUniqueOrThrow({ where: { id }, include: { inventory: true, safety: true } }); }
  it('aggregates every review and excludes missing category scores, including concurrent writes', async () => {
    const orders = await Promise.all([order(), order(), order()]);
    await Promise.all(orders.map((item, i) => moderationService.submitReview(customerId, item.id, {
      orderId: item.id, overallRating: i + 2, ...(i ? { qualityRating: 4, collectionRating: i + 2, varietyRating: 3, quantityRating: 5 } : { valueRating: 2 }),
    })));
    const summary = await moderationService.getMerchantRatings(merchantId);
    expect(summary.overallRating).toEqual({ average: 3, count: 3 });
    expect(summary.collectionRating).toEqual({ average: 3.5, count: 2 });
    expect(summary.qualityRating).toEqual({ average: 4, count: 2 });
    expect((await moderationService.listMerchantReviews(merchantId, 1, 1)).ratings).toEqual(summary);
    expect((await prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } })).ratingCount).toBe(3);
    expect((await prisma.review.findUniqueOrThrow({ where: { orderId: orders[0].id } })).valueRating).toBe(2);
  });
  it('allows exactly one concurrent review per completed order', async () => {
    const item = await order();
    const results = await Promise.allSettled([1,2].map(() => moderationService.submitReview(customerId, item.id, { orderId: item.id, overallRating: 5 })));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.review.count({ where: { orderId: item.id } })).toBe(1);
  });
  it('retains reserved and sold offers across feed, search and merchant APIs', async () => {
    const item = await listing();
    await inventoryService.atomicReserve(item.id, 2);
    for (const state of ['RESERVED', 'SOLD_OUT']) {
      if (state === 'SOLD_OUT') await inventoryService.atomicConfirmSold(item.id, 2);
      const feed = await nearby(new NextRequest(`http://localhost/api/listings/nearby?scope=all&q=${run}&limit=50`));
      const found = (await feed.json()).data.find((row: any) => row.id === item.id);
      expect(found).toMatchObject({ availability: state, remainingQuantity: 0, canReserve: false });
      const results = await search(new NextRequest(`http://localhost/api/listings/search?q=${run}`));
      expect((await results.json()).data.some((row: any) => row.id === item.id)).toBe(true);
      const store = await merchantDetail(new NextRequest(`http://localhost/api/merchants/${merchantId}`), { params: Promise.resolve({ id: merchantId }) });
      expect((await store.json()).data.activeListings.some((row: any) => row.id === item.id)).toBe(true);
    }
  });
  it('keeps mixed paid/held stock published and releases expired holds once', async () => {
    const item = await listing(3);
    const hold = await reservationService.createReservation({ customerId, listingId: item.id, quantity: 2 });
    expect(hold.success).toBe(true);
    await inventoryService.atomicReserve(item.id, 1); await inventoryService.atomicConfirmSold(item.id, 1);
    expect((await snapshot(item.id)).status).toBe('PUBLISHED');
    await prisma.reservation.update({ where: { id: hold.reservation!.id }, data: { expiresAt: new Date(0) } });
    await Promise.all([reservationService.sweepExpiredReservations(item.id), reservationService.sweepExpiredReservations(item.id)]);
    expect(listingAvailability(await snapshot(item.id))).toMatchObject({ availability: 'AVAILABLE', remainingQuantity: 2 });
    expect((await snapshot(item.id)).inventory!.soldQuantity).toBe(1);
  });
  it('bounds concurrent reservations and reopens truly restocked inventory', async () => {
    const item = await listing(2);
    const attempts = await Promise.all([1,2,3,4].map(() => inventoryService.atomicReserve(item.id, 1)));
    expect(attempts.filter(result => result.success)).toHaveLength(2);
    await inventoryService.atomicConfirmSold(item.id, 2);
    await listingService.adjustListingStock(merchantId, item.id, { deltaQuantity: 1 });
    expect(listingAvailability(await snapshot(item.id))).toMatchObject({ availability: 'AVAILABLE', remainingQuantity: 1 });
  });
  it.each(['PAUSED', 'UNSAFE', 'EXPIRED'])('does not expose or reopen %s inventory', async (state) => {
    const item = await listing(); await inventoryService.atomicReserve(item.id, 1);
    if (state === 'UNSAFE') await prisma.listingSafety.update({ where: { listingId: item.id }, data: { safetyStatus: 'UNSAFE' } });
    else await prisma.listing.update({ where: { id: item.id }, data: state === 'EXPIRED' ? { pickupEnd: new Date(Date.now() - 1) } : { status: 'PAUSED' } });
    await inventoryService.atomicRelease(item.id, 1);
    await listingService.adjustListingStock(merchantId, item.id, { deltaQuantity: 1 });
    expect(listingAvailability(await snapshot(item.id)).canReserve).toBe(false);
    const feed = await nearby(new NextRequest(`http://localhost/api/listings/nearby?scope=all&q=${run}&limit=50`));
    expect((await feed.json()).data.some((row: any) => row.id === item.id)).toBe(false);
  });
});
