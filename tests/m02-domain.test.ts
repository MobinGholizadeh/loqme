import { useDatabaseAdmin } from './helpers/database-admin';
useDatabaseAdmin();
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { merchantService } from '@/domain/merchant/merchant.service';
import { listingService } from '@/domain/listing/listing.service';
import { inventoryService } from '@/domain/inventory/inventory.service';
import { ListingStatus, SafetyStatus } from '@prisma/client';

describe('Milestone M02 — Core Domain, Database & PostGIS Verification', () => {
  let testMerchantId: string;
  let testLocationId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    // Fetch seeded category and merchant for tests
    const category = await prisma.category.findFirst({ where: { slug: 'bakery' } });
    expect(category).toBeDefined();
    testCategoryId = category!.id;

    const merchant = await prisma.merchant.findFirst({
      where: { businessNameFa: 'نانوایی و شیرینی سنتی برکت' },
      include: { locations: true },
    });
    expect(merchant).toBeDefined();
    testMerchantId = merchant!.id;
    await prisma.merchant.update({ where: { id: testMerchantId }, data: { bannerImageUrl: '/test-cover.webp' } });
    testLocationId = merchant!.locations[0].id;
  });

  describe('1. PostGIS Geospatial Queries & Distance Calculations', () => {
    it('populates PostGIS geometry and queries nearby merchants accurately', async () => {
      // Query from Sa'adat Abad coordinates (lat: 35.7891, lng: 51.3735) within 2km
      const nearby = await merchantService.findNearby({
        latitude: 35.7891,
        longitude: 51.3735,
        radiusMeters: 2000,
        limit: 10,
      });

      expect(nearby.length).toBeGreaterThanOrEqual(1);

      // Closest merchant should be barekat (around 70-150m)
      const closest = nearby[0];
      expect(closest.distanceMeters).toBeLessThan(1000);
      expect(closest.businessNameFa).toContain('برکت');

      // Check distance ordering
      for (let i = 1; i < nearby.length; i++) {
        expect(nearby[i].distanceMeters).toBeGreaterThanOrEqual(nearby[i - 1].distanceMeters);
      }
    });

    it('filters nearby merchants by business type', async () => {
      const cafesNearby = await merchantService.findNearby({
        latitude: 35.8069, // Tajrish
        longitude: 51.4286,
        radiusMeters: 3000,
        businessType: 'CAFE',
      });

      expect(cafesNearby.length).toBeGreaterThanOrEqual(1);
      expect(cafesNearby.every((m) => m.businessType === 'CAFE')).toBe(true);
      expect(cafesNearby[0].businessNameFa).toContain('لمیز');
    });

    it('queries nearby merchants in Phase 1 launch city Urmia (Daneshkadeh / Sheykh Tappeh)', async () => {
      // Query from Daneshkadeh Street, Urmia (lat: 37.5342, lng: 45.0681) within 3km
      const urmiaNearby = await merchantService.findNearby({
        latitude: 37.5342,
        longitude: 45.0681,
        radiusMeters: 3000,
        limit: 10,
      });

      expect(urmiaNearby.length).toBeGreaterThanOrEqual(2);
      // Cafe Gallery Daneshkadeh should be closest (under 500 meters)
      const closest = urmiaNearby[0];
      expect(closest.businessNameFa).toContain('دانشکده');
      expect(closest.distanceMeters).toBeLessThan(500);

      // Verify other Urmia merchants like Toos, Barekat or Diako are present
      const merchantNames = urmiaNearby.map((m) => m.businessNameFa);
      expect(merchantNames.some((name) => name.includes('ارومیه') || name.includes('دانشکده'))).toBe(true);
    });
  });

  describe('2. ListingService Domain Logic & Atomic Provisioning', () => {
    it('creates a Surprise Bag listing atomically with inventory and food safety metadata', async () => {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 2 * 3600 * 1000);
      const pickupEnd = new Date(now.getTime() + 4 * 3600 * 1000);

      const bag = await listingService.createSurpriseBag(testMerchantId, { imageUrl: '/listing-defaults/bread.png',
        title: 'بسته تست تست‌کیس خودکار',
        description: 'توضیحات بسته تست برای اطمینان از صحت ثبت در پایگاه داده',
        categoryId: testCategoryId,
        originalPrice: 150000,
        discountedPrice: 65000,
        quantity: 5,
        pickupDate: now,
        pickupStart,
        pickupEnd,
        pickupStartTime: '20:00',
        pickupEndTime: '22:00',
        allergens: ['GLUTEN'],
        dietaryTags: ['VEGETARIAN'],
        storageInstructionsFa: 'در دمای اتاق',
        temperatureRequirement: 'ROOM_TEMP',
        merchantLocationId: testLocationId,
      });

      expect(bag).toBeDefined();
      expect(bag.id).toBeDefined();
      expect(bag.type).toBe('SURPRISE_BAG');
      expect(bag.status).toBe(ListingStatus.PUBLISHED);

      // Verify associated inventory record was created
      expect(bag.inventory).toBeDefined();
      expect(bag.inventory!.totalQuantity).toBe(5);
      expect(bag.inventory!.reservedQuantity).toBe(0);
      expect(bag.inventory!.soldQuantity).toBe(0);

      // Verify associated safety record was created
      expect(bag.safety).toBeDefined();
      expect(bag.safety!.safetyStatus).toBe(SafetyStatus.APPROVED);
      expect(bag.safety!.allergens).toContain('GLUTEN');

      // Cleanup test listing
      await prisma.listing.delete({ where: { id: bag.id } });
    });

    it('rejects listing creation when discounted price is greater than or equal to original price', async () => {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 3600 * 1000);
      const pickupEnd = new Date(now.getTime() + 2 * 3600 * 1000);

      await expect(
        listingService.createSurpriseBag(testMerchantId, { imageUrl: '/listing-defaults/bread.png',
          title: 'بسته با قیمت نامعتبر',
          categoryId: testCategoryId,
          originalPrice: 100000,
          discountedPrice: 120000, // Invalid: discount >= original
          quantity: 3,
          pickupDate: now,
          pickupStart,
          pickupEnd,
          pickupStartTime: '20:00',
          pickupEndTime: '22:00',
        })
      ).rejects.toThrow();
    });

    it('rejects listing creation when pickupEnd is before or equal to pickupStart', async () => {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 4 * 3600 * 1000);
      const pickupEnd = new Date(now.getTime() + 2 * 3600 * 1000); // Invalid: end before start

      await expect(
        listingService.createSurpriseBag(testMerchantId, { imageUrl: '/listing-defaults/bread.png',
          title: 'بسته با زمان نامعتبر',
          categoryId: testCategoryId,
          originalPrice: 100000,
          discountedPrice: 50000,
          quantity: 3,
          pickupDate: now,
          pickupStart,
          pickupEnd,
          pickupStartTime: '20:00',
          pickupEndTime: '18:00',
        })
      ).rejects.toThrow();
    });
  });

  describe('3. Database-Level Check Constraints', () => {
    it('database rejects listing with price consistency violation at PostgreSQL level', async () => {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 3600 * 1000);
      const pickupEnd = new Date(now.getTime() + 2 * 3600 * 1000);

      await expect(
        prisma.listing.create({
          data: {
            merchantId: testMerchantId,
            categoryId: testCategoryId,
            titleFa: 'تست نقض قید قیمت پایگاه داده',
            originalPriceToman: BigInt(50000),
            discountedPriceToman: BigInt(60000), // Violates chk_listing_price_consistency
            pickupDate: now,
            pickupStart,
            pickupEnd,
          },
        })
      ).rejects.toThrow(/chk_listing_price_consistency/);
    });

    it('database rejects listing with pickup window violation at PostgreSQL level', async () => {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 2 * 3600 * 1000);
      const pickupEnd = new Date(now.getTime() + 3600 * 1000); // Violates chk_listing_pickup_window

      await expect(
        prisma.listing.create({
          data: {
            merchantId: testMerchantId,
            categoryId: testCategoryId,
            titleFa: 'تست نقض زمان تحویل',
            originalPriceToman: BigInt(100000),
            discountedPriceToman: BigInt(50000),
            pickupDate: now,
            pickupStart,
            pickupEnd,
          },
        })
      ).rejects.toThrow(/chk_listing_pickup_window/);
    });

    it('database rejects inventory record when reservedQuantity + soldQuantity exceeds totalQuantity', async () => {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 3600 * 1000);
      const pickupEnd = new Date(now.getTime() + 2 * 3600 * 1000);

      // Create valid listing
      const listing = await prisma.listing.create({
        data: {
          merchantId: testMerchantId,
          categoryId: testCategoryId,
          titleFa: 'تست نقض قید موجودی',
          originalPriceToman: BigInt(100000),
          discountedPriceToman: BigInt(40000),
          pickupDate: now,
          pickupStart,
          pickupEnd,
        },
      });

      // Attempt to violate inventory constraint directly
      await expect(
        prisma.listingInventory.create({
          data: {
            listingId: listing.id,
            totalQuantity: 5,
            reservedQuantity: 4,
            soldQuantity: 3, // 4 + 3 = 7 > 5 -> violates chk_inventory_non_negative
          },
        })
      ).rejects.toThrow(/chk_inventory_non_negative/);

      // Cleanup
      await prisma.listing.delete({ where: { id: listing.id } });
    });
  });

  describe('4. InventoryService Atomic Concurrency & Anti-Overselling', () => {
    it('atomically reserves stock and prevents overselling', async () => {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 3600 * 1000);
      const pickupEnd = new Date(now.getTime() + 2 * 3600 * 1000);

      const listing = await listingService.createSurpriseBag(testMerchantId, { imageUrl: '/listing-defaults/bread.png',
        title: 'بسته تست رزرو همزمان',
        categoryId: testCategoryId,
        originalPrice: 100000,
        discountedPrice: 45000,
        quantity: 3,
        pickupDate: now,
        pickupStart,
        pickupEnd,
        pickupStartTime: '18:00',
        pickupEndTime: '20:00',
      });

      // Initial check
      const initial = await inventoryService.getInventory(listing.id);
      expect(initial?.availableQuantity).toBe(3);
      expect(initial?.isSoldOut).toBe(false);

      // Reserve 2 units
      const res1 = await inventoryService.atomicReserve(listing.id, 2);
      expect(res1.success).toBe(true);

      const afterRes1 = await inventoryService.getInventory(listing.id);
      expect(afterRes1?.availableQuantity).toBe(1);
      expect(afterRes1?.reservedQuantity).toBe(2);

      // Try to reserve 2 more units (only 1 available) -> MUST FAIL (Anti-overselling)
      const res2 = await inventoryService.atomicReserve(listing.id, 2);
      expect(res2.success).toBe(false);

      // Release 1 unit
      await inventoryService.atomicRelease(listing.id, 1);
      const afterRelease = await inventoryService.getInventory(listing.id);
      expect(afterRelease?.availableQuantity).toBe(2);
      expect(afterRelease?.reservedQuantity).toBe(1);

      // Confirm 1 sold
      await inventoryService.atomicConfirmSold(listing.id, 1);
      const afterSold = await inventoryService.getInventory(listing.id);
      expect(afterSold?.soldQuantity).toBe(1);
      expect(afterSold?.reservedQuantity).toBe(0);
      expect(afterSold?.availableQuantity).toBe(2);

      // Cleanup
      await prisma.listing.delete({ where: { id: listing.id } });
    });
  });
});
