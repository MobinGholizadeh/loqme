import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getApplication, listApplications, reviewApplication, submitApplication } from '@/domain/business/application.service';
import { createSessionToken } from '@/lib/auth/session';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/business/application/route';
import type { MerchantApplicationInput } from '@loqme/types';

// Never run these mutation/concurrency cases against the developer's primary database.
const isolated = new URL(process.env.DATABASE_URL || 'postgresql://localhost/none').pathname.startsWith('/loqme_onboarding_test_');
describe.skipIf(!isolated)('business application real PostgreSQL transactions', () => {
  const run = randomUUID().slice(0, 8); const users: string[] = []; const apps: string[] = []; const stores: string[] = [];
  let admin: string; let cityId: string; let sequence = 0;
  const input = (): MerchantApplicationInput => ({ ownerName: 'مالک آزمون', businessNameFa: `کافه ${run} ${sequence++}`, businessType: 'CAFE', cityId, addressFa: 'ارومیه خیابان آزمایشی', latitude: 37.54, longitude: 45.06,
    hours: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: dayOfWeek < 6, storeOpenTime: dayOfWeek < 6 ? '09:00' : '', storeCloseTime: dayOfWeek < 6 ? '21:00' : '' })),
  });
  async function user(role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER', isActive = true) {
    const created = await prisma.user.create({ data: { mobile: `test-${run}-${sequence++}`, role, isActive } }); users.push(created.id); return created.id;
  }
  async function submit(id: string, value = input()) { const a = await submitApplication(id, value); if (!apps.includes(a.id)) apps.push(a.id); return a; }
  const decision = (revision = 1) => ({ decision: 'APPROVED' as const, reasonFa: 'مالکیت و مدارک بررسی شد', expectedRevision: revision });
  beforeAll(async () => { cityId = (await prisma.city.findFirstOrThrow({ where: { slug: 'urmia' } })).id; admin = await user('ADMIN'); });
  afterAll(async () => {
    const createdStores = await prisma.merchant.findMany({ where: { ownerUserId: { in: users } }, select: { id: true } }); stores.push(...createdStores.map(s => s.id));
    await prisma.auditLog.deleteMany({ where: { actorId: { in: users } } });
    await prisma.merchantApplication.deleteMany({ where: { applicantId: { in: users } } });
    await prisma.merchantHours.deleteMany({ where: { location: { merchantId: { in: stores } } } });
    await prisma.merchantLocation.deleteMany({ where: { merchantId: { in: stores } } });
    await prisma.merchantStaff.deleteMany({ where: { merchantId: { in: stores } } });
    await prisma.merchant.deleteMany({ where: { id: { in: stores } } });
    await prisma.customer.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });
  it('stores a pending application without creating a public merchant or granting merchant access', async () => {
    const id = await user(); const a = await submit(id);
    expect(a.status).toBe('PENDING'); expect(await prisma.merchant.count({ where: { ownerUserId: id } })).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).role).toBe('CUSTOMER');
    expect(await getApplication(await user())).toBeNull();
  });
  it('serializes simultaneous submissions into a single application', async () => {
    const id = await user(); const value = input(); const results = await Promise.all(Array.from({ length: 5 }, () => submit(id, value)));
    expect(new Set(results.map(r => r.id)).size).toBe(1);
  });
  it('approves once under concurrency, preserving unset pickup defaults and creating one audit', async () => {
    const id = await user(); const a = await submit(id);
    const results = await Promise.all(Array.from({ length: 3 }, () => reviewApplication(admin, a.id, decision())));
    expect(new Set(results.map(r => r.merchantId)).size).toBe(1);
    const store = await prisma.merchant.findUniqueOrThrow({ where: { id: results[0].merchantId! }, include: { staff: true, locations: { include: { hours: true } } } });
    expect(store.ownerUserId).toBe(id); expect(store.staff[0].role).toBe('OWNER'); expect(store.locations[0].hours).toHaveLength(7);
    expect(store.locations[0].hours.every(h => h.defaultPickupStart === null && h.defaultPickupEnd === null)).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).role).toBe('MERCHANT_OWNER');
    expect(await prisma.auditLog.count({ where: { entityId: a.id } })).toBe(1);
  });
  it('rejects and resubmits with revision protection', async () => {
    const id = await user(); const a = await submit(id);
    const rejected = await reviewApplication(admin, a.id, { ...decision(), decision: 'REJECTED', reasonFa: 'نشانی دقیق اصلاح شود' });
    expect(rejected.reviewReason).toContain('نشانی');
    const revised = await submit(id, { ...input(), addressFa: 'نشانی اصلاح‌شده فروشگاه' }); expect(revised.revision).toBe(2);
    await expect(reviewApplication(admin, a.id, decision())).rejects.toThrow('تغییر');
    expect((await reviewApplication(admin, a.id, decision(2))).status).toBe('APPROVED');
  });
  it('rejects unsupported cities, inactive accounts, nonadmins, and forged fields', async () => {
    const id = await user(); await expect(submitApplication(id, { ...input(), cityId: 'unknown' })).rejects.toThrow('شهر');
    await expect(submitApplication(await user('CUSTOMER', false), input())).rejects.toThrow('فعال');
    const a = await submit(id); await expect(reviewApplication(id, a.id, decision())).rejects.toThrow('دسترسی');
    await expect(listApplications(id)).rejects.toThrow('دسترسی');
    await expect(submitApplication(id, { ...input(), ownerUserId: admin } as MerchantApplicationInput)).rejects.toThrow();
  });
  it('detects duplicate map claims and never transfers an existing store', async () => {
    const value = { ...input(), mapirPlaceId: `map-${run}` }; const firstUser = await user(); const first = await submit(firstUser, value);
    await reviewApplication(admin, first.id, decision());
    const second = await submit(await user(), value);
    const list = await listApplications(admin); expect(list.items.find(a => a.id === second.id)?.duplicates[0].exact).toBe(true);
    await expect(reviewApplication(admin, second.id, decision())).rejects.toThrow('مشابه');
    expect((await prisma.merchant.findUniqueOrThrow({ where: { mapirPlaceId: value.mapirPlaceId } })).ownerUserId).toBe(firstUser);
  });
  it('requires authentication and scopes application reads to the verified user', async () => {
    expect((await GET(new NextRequest('http://localhost/api/business/application'))).status).toBe(401);
    const id = await user(); const token = await createSessionToken({ userId: id, mobile: 'test', role: 'CUSTOMER' });
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const response = await POST(new NextRequest('http://localhost/api/business/application', { method: 'POST', headers, body: JSON.stringify(input()) }));
    expect(response.status).toBe(200); const submitted = (await response.json()).data; apps.push(submitted.id);
    const other = await user(); const otherToken = await createSessionToken({ userId: other, mobile: 'test', role: 'CUSTOMER' });
    const read = await GET(new NextRequest(`http://localhost/api/business/application?applicantId=${id}`, { headers: { authorization: `Bearer ${otherToken}` } }));
    expect((await read.json()).data).toBeNull();
    expect((await POST(new NextRequest('http://localhost/api/business/application', { method: 'POST', headers: { ...headers, origin: 'https://evil.example' }, body: JSON.stringify(input()) }))).status).toBe(403);
  });
});
