import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { MerchantService } from '@/domain/merchant/merchant.service';

describe('Staff invitation persistence and merchant access', () => {
  const service = new MerchantService(), run = randomUUID();
  let ownerId: string, merchantId: string;
  const invitedIds: string[] = [];
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.startsWith('/loqme_onboarding_test_')) throw new Error('Disposable database required');
    ownerId = (await prisma.user.create({ data: { mobile: `invite-owner-${run}`, role: 'MERCHANT_OWNER' } })).id;
    merchantId = (await prisma.merchant.create({ data: { ownerUserId: ownerId, businessNameFa: 'آزمون دعوت' } })).id;
  });
  afterAll(async () => {
    if (merchantId) await prisma.merchant.delete({ where: { id: merchantId } });
    await prisma.user.deleteMany({ where: { id: { in: [...invitedIds, ...(ownerId ? [ownerId] : [])] } } });
  });
  it('allows an existing customer to enter only the store that invited them', async () => {
    const user = await prisma.user.create({ data: { mobile: `invite-customer-${run}`, customer: { create: { fullName: 'همکار' } } } }); invitedIds.push(user.id);
    await service.addStaffMember(ownerId, { mobile: user.mobile, role: 'CASHIER', canScanPickup: false }, merchantId);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('MERCHANT_STAFF');
    expect(await service.resolveMerchantAndAuthorize(user.id, merchantId)).toMatchObject({ role: 'CASHIER', isOwner: false });
    await expect(service.resolveMerchantAndAuthorize(user.id, 'foreign-store')).rejects.toThrow();
    expect((await service.getStaffList(ownerId, merchantId))[0]).toMatchObject({ fullName: 'همکار', canScanPickup: false });
    await expect(service.addStaffMember(ownerId, { mobile: user.mobile, role: 'MANAGER' }, merchantId)).rejects.toThrow('قبلاً');
    expect(await prisma.merchantStaff.count({ where: { merchantId, userId: user.id } })).toBe(1);
  });
  it('creates a new staff account and grants its requested store role', async () => {
    const staff = await service.addStaffMember(ownerId, { mobile: `invite-new-${run}`, fullName: 'همکار جدید', role: 'MANAGER' }, merchantId); invitedIds.push(staff.userId);
    expect(staff).toMatchObject({ fullName: 'همکار جدید', role: 'MANAGER', canScanPickup: true });
    expect(await service.resolveMerchantAndAuthorize(staff.userId, merchantId)).toMatchObject({ role: 'MANAGER' });
  });
  it('preserves an existing owner role when that user joins another store', async () => {
    const user = await prisma.user.create({ data: { mobile: `invite-other-owner-${run}`, role: 'MERCHANT_OWNER' } }); invitedIds.push(user.id);
    await service.addStaffMember(ownerId, { mobile: user.mobile, role: 'CASHIER' }, merchantId);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('MERCHANT_OWNER');
    expect(await service.resolveMerchantAndAuthorize(user.id, merchantId)).toMatchObject({ role: 'CASHIER', isOwner: false });
  });
});
