import { merchantService } from './merchant.service';
import { StaffRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type MerchantAction = 'REPORT_READ' | 'LISTING_WRITE' | 'PICKUP_READ';

/** Scope is built from current database membership, never from a caller's claimed role. */
export async function requireMerchantContext(userId: string, merchantId: string | undefined, action: MerchantAction, locationId?: string) {
  if (!merchantId) {
    const contexts = await listMerchantContexts(userId);
    if (contexts.length !== 1) throw new Error('عدم دسترسی: فروشگاه را انتخاب کنید');
    merchantId = contexts[0].id;
  }
  const minimum = action === 'REPORT_READ' ? StaffRole.OWNER : action === 'LISTING_WRITE' ? StaffRole.MANAGER : undefined;
  const access = await merchantService.resolveMerchantAndAuthorize(userId, merchantId, minimum);
  if (action === 'PICKUP_READ' && !access.isOwner && !access.staffMember?.canScanPickup) throw new Error('عدم دسترسی: مجوز تحویل فعال نیست');
  if (locationId && !access.merchant.locations.some(location => location.id === locationId)) {
    throw new Error('عدم دسترسی: شعبه متعلق به این فروشگاه نیست');
  }
  return { ...access, userId, merchantId: access.merchant.id, locationId };
}

export async function listMerchantContexts(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
  if (!user?.isActive || !['MERCHANT_OWNER', 'MERCHANT_STAFF'].includes(user.role)) throw new Error('عدم دسترسی');
  const merchants = await prisma.merchant.findMany({ where: { OR: [{ ownerUserId: userId }, { staff: { some: { userId } } }] },
    select: { id: true, businessNameFa: true, ownerUserId: true, staff: { where: { userId }, select: { role: true } },
      locations: { select: { id: true, addressFa: true }, orderBy: { id: 'asc' } } }, orderBy: { id: 'asc' } });
  return merchants.map(m => ({ id: m.id, nameFa: m.businessNameFa, role: m.ownerUserId === userId ? 'OWNER' : m.staff[0].role,
    locations: m.locations.map(l => ({ id: l.id, nameFa: l.addressFa })) }));
}
