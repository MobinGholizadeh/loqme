import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { decodeJwt } from 'jose';
import { NextRequest } from 'next/server';
import { PickupDetailsSchema } from '@loqme/validation';
import { readPickupDetails, updatePickupDetails } from '@/domain/listing/pickup-details';
import { listingService } from '@/domain/listing/listing.service';
import { prisma } from '@/lib/prisma';
import { createSessionToken, verifySessionToken, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session';
import { GET as detail } from '@/app/api/listings/[id]/route';

describe('pickup contracts and session lifetime', () => {
  it('preserves unknown packaging and rejects coerced flags or oversized instructions', () => {
    expect(readPickupDetails([])).toEqual({ containerProvided: null, carrierBagProvided: null, instructionsFa: '' });
    expect(PickupDetailsSchema.safeParse({ containerProvided: 'false' }).success).toBe(false);
    expect(PickupDetailsSchema.safeParse({ instructionsFa: 'a'.repeat(501) }).success).toBe(false);
    expect(readPickupDetails([{ key: 'pickupDetails', valueJson: { carrierBagProvided: true } }]).carrierBagProvided).toBe(true);
  });
  it('uses the same 30-day lifetime for JWT and cookie', async () => {
    const token = await createSessionToken({ userId: 'expiry-test', mobile: '09121111111', role: 'CUSTOMER' });
    const jwt = decodeJwt(token);
    expect(jwt.exp! - jwt.iat!).toBe(30 * 86400);
    expect(SESSION_COOKIE_OPTIONS.maxAge).toBe(jwt.exp! - jwt.iat!);
    expect(await verifySessionToken(token)).not.toBeNull();
  });
});

describe.skipIf(!process.env.DATABASE_URL?.includes('/loqme_onboarding_test'))('pickup persistence and ownership', () => {
  let ownerId: string; let merchantId: string; let listingId: string;
  const values = { containerProvided: true, carrierBagProvided: false, instructionsFa: 'به صندوق مراجعه کنید.' };
  beforeAll(async () => {
    ownerId = (await prisma.user.create({ data: { mobile: `cp14-${randomUUID()}`, role: 'MERCHANT_OWNER' } })).id;
    merchantId = (await prisma.merchant.create({ data: { ownerUserId: ownerId, businessNameFa: 'فروشگاه آزمون', verificationStatus: 'APPROVED', bannerImageUrl: '/test-cover.webp' } })).id;
    listingId = (await listingService.createListing({ imageUrl: '/listing-defaults/bread.png', merchantId, categoryId: (await prisma.category.findFirstOrThrow()).id,
      type: 'SURPRISE_BAG', titleFa: 'بسته آزمون', descriptionFa: 'توضیحات بسته آزمون', originalPriceToman: 100, discountedPriceToman: 50,
      quantity: 3, pickupDate: new Date(), pickupStart: new Date(), pickupEnd: new Date(Date.now() + 3600000),
      temperatureRequirement: 'ROOM_TEMP', dietaryTags: [], allergens: [], pickupDetails: values,
    })).id;
  });
  afterAll(async () => {
    await prisma.listing.delete({ where: { id: listingId } });
    await prisma.merchant.delete({ where: { id: merchantId } });
    await prisma.user.delete({ where: { id: ownerId } });
  });
  it('returns the saved flags and Persian instructions on public detail', async () => {
    const response = await detail(new NextRequest(`http://localhost/api/listings/${listingId}`), { params: Promise.resolve({ id: listingId }) });
    expect(response.status).toBe(200);
    expect((await response.json()).data.pickupDetails).toEqual(values);
  });
  it('rejects another merchant and leaves existing values intact', async () => {
    await expect(updatePickupDetails(randomUUID(), listingId, { carrierBagProvided: true })).rejects.toThrow('عدم دسترسی');
    expect(readPickupDetails((await listingService.getMerchantListings(merchantId))[0].attributes)).toEqual(values);
  });
  it('serializes concurrent edits without duplicate attributes or inventory changes', async () => {
    await Promise.all([true, false].map(carrierBagProvided => updatePickupDetails(merchantId, listingId, { ...values, carrierBagProvided })));
    const saved = (await listingService.getMerchantListings(merchantId))[0];
    expect(saved.attributes.filter(item => item.key === 'pickupDetails')).toHaveLength(1);
    expect(saved.inventory?.totalQuantity).toBe(3); expect(saved.status).toBe('PUBLISHED');
  });
});
