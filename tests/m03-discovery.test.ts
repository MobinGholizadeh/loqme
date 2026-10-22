import { useDatabaseAdmin } from './helpers/database-admin';
useDatabaseAdmin();
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GET as getNearbyListings } from '@/app/api/listings/nearby/route';
import { GET as searchListings } from '@/app/api/listings/search/route';
import { GET as getListingDetail } from '@/app/api/listings/[id]/route';
import { GET as getMerchantDetail } from '@/app/api/merchants/[id]/route';
import { POST as toggleFavorite } from '@/app/api/merchants/[id]/favorite/route';
import { createSessionToken } from '@/lib/auth/session';
import { NextRequest } from 'next/server';

describe('Milestone M03 — Marketplace Discovery & Proximity Verification', () => {
  let sampleListingId: string;
  let sampleMerchantId: string;
  let customerUserToken: string;

  beforeAll(async () => {
    // 1. Fetch sample merchant and active listing from seed
    const merchant = await prisma.merchant.findFirst({
      where: { businessNameFa: { contains: 'دیاکو' } },
      include: { locations: true, listings: true },
    });
    expect(merchant).toBeDefined();
    sampleMerchantId = merchant!.id;

    const listing = await prisma.listing.findFirst({
      where: { merchantId: sampleMerchantId, pickupEnd: { gt: new Date() } },
    });
    expect(listing).toBeDefined();
    sampleListingId = listing!.id;

    // 2. Fetch customer user and create session token
    const customer = await prisma.user.findFirst({
      where: { mobile: '09121111111' },
      include: { customer: true },
    });
    expect(customer).toBeDefined();

    customerUserToken = await createSessionToken({
      userId: customer!.id,
      mobile: customer!.mobile,
      role: 'CUSTOMER',
      fullName: customer!.customer?.fullName || 'سارا محمدی',
    });
  });

  describe('1. Spatial Proximity API (/api/listings/nearby)', () => {
    it('returns active listings in Phase 1 launch city Urmia (Daneshkadeh)', async () => {
      const url = 'http://localhost:3000/api/listings/nearby?latitude=37.5342&longitude=45.0681&radiusMeters=10000';
      const req = new NextRequest(url);
      const res = await getNearbyListings(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      // Verify that all returned listings have distanceMeters calculated
      const first = data.data[0];
      expect(first.distanceMeters).toBeDefined();
      expect(typeof first.distanceMeters).toBe('number');
      expect(first.storeNameFa).toBeDefined();
      expect(first.pickupWindowFa).toBeDefined();
      expect(first.safetyVerified).toBe(true);

      // Verify ascending distance ordering
      for (let i = 1; i < data.data.length; i++) {
        expect(data.data[i].distanceMeters).toBeGreaterThanOrEqual(data.data[i - 1].distanceMeters);
      }
    });

    it('enforces spatial radius constraint correctly (1km vs 10km)', async () => {
      const req1km = new NextRequest(
        'http://localhost:3000/api/listings/nearby?latitude=37.5342&longitude=45.0681&radiusMeters=1000'
      );
      const res1km = await getNearbyListings(req1km);
      const data1km = await res1km.json();

      const req10km = new NextRequest(
        'http://localhost:3000/api/listings/nearby?latitude=37.5342&longitude=45.0681&radiusMeters=10000'
      );
      const res10km = await getNearbyListings(req10km);
      const data10km = await res10km.json();

      expect(res1km.status).toBe(200);
      expect(res10km.status).toBe(200);
      expect(data10km.data.length).toBeGreaterThanOrEqual(data1km.data.length);

      // In 1km, all merchants must be <= 1000 meters away
      for (const item of data1km.data) {
        expect(item.distanceMeters).toBeLessThanOrEqual(1000);
      }
    });

    it('filters listings by businessType (RESTAURANT)', async () => {
      const reqRestaurant = new NextRequest(
        'http://localhost:3000/api/listings/nearby?latitude=37.5342&longitude=45.0681&radiusMeters=10000&businessType=RESTAURANT'
      );
      const resRestaurant = await getNearbyListings(reqRestaurant);
      const dataRestaurant = await resRestaurant.json();

      expect(dataRestaurant.success).toBe(true);
      expect(dataRestaurant.data.length).toBeGreaterThan(0);
      expect(dataRestaurant.data.every((item: any) => item.businessType === 'RESTAURANT')).toBe(true);
    });

    it('returns 400 for invalid coordinates or out-of-range radius', async () => {
      const invalidReq = new NextRequest(
        'http://localhost:3000/api/listings/nearby?latitude=999&longitude=45.0681&radiusMeters=50000'
      );
      const res = await getNearbyListings(invalidReq);
      expect(res.status).toBe(400);
    });
  });

  describe('2. Search API (/api/listings/search)', () => {
    it('searches listings by keyword in title or merchant name', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings/search?q=کباب');
      const res = await searchListings(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      const match = json.data[0];
      const titleOrStoreMatches =
        match.titleFa.includes('کباب') || match.storeNameFa.includes('کباب') || match.descriptionFa?.includes('کباب');
      expect(titleOrStoreMatches).toBe(true);
    });

    it('sanitizes and rejects queries shorter than minimum length', async () => {
      const req = new NextRequest('http://localhost:3000/api/listings/search?q=a');
      const res = await searchListings(req);
      expect(res.status).toBe(400);
    });
  });

  describe('3. Listing Detail View API (/api/listings/[id])', () => {
    it('returns full listing details, verified safety tags, and honest pricing', async () => {
      const req = new NextRequest(`http://localhost:3000/api/listings/${sampleListingId}`);
      const res = await getListingDetail(req, { params: { id: sampleListingId } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const item = json.data;

      expect(item.id).toBe(sampleListingId);
      expect(item.originalPriceToman).toBeGreaterThan(item.discountedPriceToman);
      expect(item.savingsToman).toBe(item.originalPriceToman - item.discountedPriceToman);
      expect(item.discountPercent).toBe(
        Math.round(((item.originalPriceToman - item.discountedPriceToman) / item.originalPriceToman) * 100)
      );

      // Food safety declarations
      expect(item.safety).toBeDefined();
      expect(item.safety.safetyStatus).toBe('APPROVED');
      expect(Array.isArray(item.safety.dietaryTags)).toBe(true);

      // Merchant info
      expect(item.merchant).toBeDefined();
      expect(item.merchant.businessNameFa).toBeDefined();
      expect(item.merchant.location).toBeDefined();
    });

    it('returns 404 for nonexistent listing id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const req = new NextRequest(`http://localhost:3000/api/listings/${fakeId}`);
      const res = await getListingDetail(req, { params: { id: fakeId } });
      expect(res.status).toBe(404);
    });
  });

  describe('4. Merchant Profile API (/api/merchants/[id])', () => {
    it('returns merchant profile with operating hours and active listings', async () => {
      const req = new NextRequest(`http://localhost:3000/api/merchants/${sampleMerchantId}`);
      const res = await getMerchantDetail(req, { params: { id: sampleMerchantId } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const merchant = json.data;

      expect(merchant.id).toBe(sampleMerchantId);
      expect(merchant.businessNameFa).toBeDefined();
      expect(merchant.location).toBeDefined();
      expect(merchant.location.hours.length).toBe(7); // 7 days a week
      expect(Array.isArray(merchant.activeListings)).toBe(true);
    });
  });

  describe('5. Favorites Lifecycle (/api/merchants/[id]/favorite)', () => {
    it('rejects unauthorized requests without session token with 401', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/merchants/${sampleMerchantId}/favorite`,
        { method: 'POST' }
      );
      const res = await toggleFavorite(req, { params: { id: sampleMerchantId } });
      expect(res.status).toBe(401);
    });

    it('toggles favorite on and off for authenticated customer', async () => {
      // 1. First toggle -> Adds favorite
      const addReq = new NextRequest(
        `http://localhost:3000/api/merchants/${sampleMerchantId}/favorite`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${customerUserToken}`,
          },
        }
      );
      const addRes = await toggleFavorite(addReq, { params: { id: sampleMerchantId } });
      const addJson = await addRes.json();

      expect(addRes.status).toBe(200);
      expect(addJson.success).toBe(true);
      expect(addJson.isFavorited).toBe(true);

      // 2. Second toggle -> Removes favorite
      const removeReq = new NextRequest(
        `http://localhost:3000/api/merchants/${sampleMerchantId}/favorite`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${customerUserToken}`,
          },
        }
      );
      const removeRes = await toggleFavorite(removeReq, { params: { id: sampleMerchantId } });
      const removeJson = await removeRes.json();

      expect(removeRes.status).toBe(200);
      expect(removeJson.success).toBe(true);
      expect(removeJson.isFavorited).toBe(false);
    });
  });
});
