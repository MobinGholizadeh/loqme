import { useDatabaseAdmin } from './helpers/database-admin';
useDatabaseAdmin();
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/domain/inventory/inventory.service';

describe('Inventory timestamp consistency', () => {
  const run = randomUUID(); let merchantId: string; let userId: string; let categoryId: string;
  const listingIds: string[] = [];
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.startsWith('/loqme_onboarding_test_')) throw new Error('Disposable database required');
    const user = await prisma.user.create({ data: { mobile: `tz-${run}`, role: 'MERCHANT_OWNER' } }); userId = user.id;
    merchantId = (await prisma.merchant.create({ data: { ownerUserId: userId, businessNameFa: 'آزمون زمان', verificationStatus: 'APPROVED' } })).id;
    categoryId = (await prisma.category.findFirstOrThrow()).id;
  });
  afterAll(async () => {
    await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
    if (merchantId) await prisma.merchant.delete({ where: { id: merchantId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
  });
  it.each(['UTC', 'Asia/Tehran'])('uses UTC pickup timestamps in a %s database session', async zone => {
    const now = new Date();
    const listing = await prisma.listing.create({ data: {
      merchantId, categoryId, titleFa: 'بسته آزمون زمان', status: 'PUBLISHED', originalPriceToman: 100, discountedPriceToman: 50,
      pickupDate: now, pickupStart: now, pickupEnd: new Date(now.getTime() + 600000),
      inventory: { create: { totalQuantity: 1 } }, safety: { create: { safetyStatus: 'APPROVED' } },
    } }); listingIds.push(listing.id);
    const service = new InventoryService();
    // Exercise the release/reconciliation query on a session with an explicit timezone.
    await prisma.listingInventory.update({ where: { listingId: listing.id }, data: { reservedQuantity: 1 } });
    await prisma.listing.update({ where: { id: listing.id }, data: { status: 'SOLD_OUT' } });
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('TimeZone', ${zone}, true)`;
      expect(await service.atomicRelease(listing.id, 1, tx)).toEqual({ success: true });
      const updated = await tx.listing.findUniqueOrThrow({ where: { id: listing.id } });
      expect(updated.status).toBe('PUBLISHED');
      expect(Math.abs(updated.updatedAt.getTime() - Date.now())).toBeLessThan(10000);
    });
    // The Ubuntu acceptance database itself runs in Asia/Tehran.
    expect(await service.atomicReserve(listing.id, 1)).toEqual({ success: true });
    expect(await service.atomicConfirmSold(listing.id, 1)).toEqual({ success: true });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe('SOLD_OUT');
  });
});
