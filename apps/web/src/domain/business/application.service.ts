import { notificationService } from '@/domain/notification/notification.service';
import { Prisma, MerchantApplication } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BusinessHoursSchema, MerchantApplicationSchema, ReviewMerchantApplicationSchema } from '@loqme/validation';
import type { MerchantApplicationDto, MerchantApplicationInput, ReviewMerchantApplicationInput } from '@loqme/types';

export class BusinessError extends Error {
  constructor(public status: number, message: string, public code = 'BUSINESS_ERROR') { super(message); }
}
async function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(fn, { isolationLevel: 'Serializable', timeout: 15000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 3) continue;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BusinessError(409, 'این درخواست یا فروشگاه قبلاً ثبت شده است؛ وضعیت درخواست را بررسی کنید');
      throw error;
    }
  }
}
export async function requireActiveAccount(id: string, tx: Prisma.TransactionClient = prisma) {
  const user = await tx.user.findUnique({ where: { id } });
  if (!user?.isActive) throw new BusinessError(401, 'لطفاً با حساب فعال وارد شوید');
  return user;
}
function dto(a: MerchantApplication & { city: { nameFa: string } }): MerchantApplicationDto {
  return {
    id: a.id, ownerName: a.ownerName, businessNameFa: a.businessNameFa, businessType: a.businessType,
    cityId: a.cityId, cityNameFa: a.city.nameFa, addressFa: a.addressFa, latitude: a.latitude, longitude: a.longitude,
    phone: a.phone, licenseNumber: a.licenseNumber, mapirPlaceId: a.mapirPlaceId,
    hours: BusinessHoursSchema.parse(a.hours), status: a.status, revision: a.revision,
    reviewReason: a.reviewReason, merchantId: a.merchantId, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(),
  };
}
export async function getApplication(userId: string) {
  const user = await requireActiveAccount(userId);
  const app = await prisma.merchantApplication.findUnique({ where: { applicantId: userId }, include: { city: true } });
  if (app && app.status === 'APPROVED') return dto(app);

  const ownedMerchant = await prisma.merchant.findFirst({
    where: {
      OR: [
        { ownerUserId: userId },
        { staff: { some: { userId } } },
      ],
      verificationStatus: 'APPROVED',
    },
    include: {
      locations: {
        include: { city: true, hours: true },
        take: 1,
      },
    },
  });

  if (ownedMerchant) {
    const loc = ownedMerchant.locations[0];
    const hours = (loc?.hours || []).map(h => ({
      dayOfWeek: h.dayOfWeek,
      isOpen: h.isOpen,
      storeOpenTime: h.storeOpenTime,
      storeCloseTime: h.storeCloseTime,
    }));
    return {
      id: app?.id || ownedMerchant.id,
      ownerName: app?.ownerName || ownedMerchant.businessNameFa,
      businessNameFa: ownedMerchant.businessNameFa,
      businessType: ownedMerchant.businessType,
      cityId: loc?.cityId || app?.cityId || '',
      cityNameFa: loc?.city?.nameFa || app?.city?.nameFa || 'ارومیه',
      addressFa: loc?.addressFa || app?.addressFa || '',
      latitude: loc?.latitude || app?.latitude || 37.55,
      longitude: loc?.longitude || app?.longitude || 45.07,
      phone: loc?.phone || app?.phone || null,
      licenseNumber: ownedMerchant.licenseNumber || app?.licenseNumber || null,
      mapirPlaceId: ownedMerchant.mapirPlaceId || app?.mapirPlaceId || null,
      hours: hours.length > 0 ? hours : (app ? BusinessHoursSchema.parse(app.hours) : []),
      status: 'APPROVED' as const,
      revision: app?.revision || 1,
      reviewReason: null,
      merchantId: ownedMerchant.id,
      createdAt: (app?.createdAt || ownedMerchant.createdAt).toISOString(),
      updatedAt: (app?.updatedAt || ownedMerchant.updatedAt).toISOString(),
    };
  }

  return app ? dto(app) : null;
}
export async function submitApplication(userId: string, input: MerchantApplicationInput) {
  const data = MerchantApplicationSchema.parse(input);
  return transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'business-applicant:' + userId}))`;
    const user = await requireActiveAccount(userId, tx);
    const existing = await tx.merchantApplication.findUnique({ where: { applicantId: userId }, include: { city: true } });
    if (existing && existing.status !== 'REJECTED') return dto(existing);
    if (user.role !== 'CUSTOMER' || await tx.merchant.count({ where: { ownerUserId: userId } }) || await tx.merchantStaff.count({ where: { userId } })) {
      throw new BusinessError(409, 'این حساب به پنل دیگری متصل است؛ از ورود کسب‌وکار استفاده کنید');
    }
    if (!await tx.city.findUnique({ where: { id: data.cityId } })) throw new BusinessError(400, 'شهر انتخاب‌شده در لقمه فعال نیست');
    const values = { ...data, phone: data.phone || null, licenseNumber: data.licenseNumber || null, mapirPlaceId: data.mapirPlaceId || null, hours: data.hours as unknown as Prisma.InputJsonValue };
    const app = existing
      ? await tx.merchantApplication.update({ where: { id: existing.id }, data: { ...values, status: 'PENDING', reviewReason: null, reviewedAt: null, reviewedById: null, revision: { increment: 1 } }, include: { city: true } })
      : await tx.merchantApplication.create({ data: { ...values, applicantId: userId }, include: { city: true } });
    return dto(app);
  });
}
function normalizedName(value: string) { return value.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\s\u200c]+/g, '').toLowerCase(); }
async function duplicates(a: MerchantApplication, tx: Prisma.TransactionClient = prisma) {
  const stores = await tx.merchant.findMany({
    where: { OR: [ ...(a.mapirPlaceId ? [{ mapirPlaceId: a.mapirPlaceId }] : []), { locations: { some: { cityId: a.cityId, latitude: { gte: a.latitude - .003, lte: a.latitude + .003 }, longitude: { gte: a.longitude - .003, lte: a.longitude + .003 } } } } ] },
    select: { id: true, businessNameFa: true, mapirPlaceId: true },
  });
  return stores.filter(s => (a.mapirPlaceId && s.mapirPlaceId === a.mapirPlaceId) || normalizedName(s.businessNameFa) === normalizedName(a.businessNameFa))
    .map(s => ({ id: s.id, businessNameFa: s.businessNameFa, exact: !!a.mapirPlaceId && s.mapirPlaceId === a.mapirPlaceId }));
}
export async function listApplications(adminId: string, page = 1) {
  const user = await requireActiveAccount(adminId);
  if (user.role !== 'ADMIN') throw new BusinessError(403, 'عدم دسترسی');
  const [items, total] = await Promise.all([
    prisma.merchantApplication.findMany({ include: { city: true, applicant: { select: { mobile: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 }),
    prisma.merchantApplication.count(),
  ]);
  return { items: await Promise.all(items.map(async a => ({ ...dto(a), applicantMobile: a.applicant.mobile, duplicates: await duplicates(a) }))), total, page, pageSize: 20 };
}
export async function reviewApplication(adminId: string, id: string, input: ReviewMerchantApplicationInput) {
  const data = ReviewMerchantApplicationSchema.parse(input);
  return transaction(async tx => {
    // Serialize approvals, including different applicants claiming the same physical store.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('business-application-review'))`;
    const admin = await requireActiveAccount(adminId, tx);
    if (admin.role !== 'ADMIN') throw new BusinessError(403, 'عدم دسترسی');
    const app = await tx.merchantApplication.findUnique({ where: { id }, include: { city: true } });
    if (!app) throw new BusinessError(404, 'درخواست یافت نشد');
    if (app.revision !== data.expectedRevision) throw new BusinessError(409, 'درخواست تغییر کرده است؛ فهرست را تازه کنید');
    if (app.status === data.decision) return dto(app);
    if (app.status !== 'PENDING') throw new BusinessError(409, 'این درخواست قبلاً بررسی شده است');
    let merchantId: string | null = null;
    if (data.decision === 'APPROVED') {
      const applicant = await requireActiveAccount(app.applicantId, tx);
      if (applicant.role !== 'CUSTOMER' || await tx.merchant.count({ where: { ownerUserId: applicant.id } }) || await tx.merchantStaff.count({ where: { userId: applicant.id } })) throw new BusinessError(409, 'حساب متقاضی به فروشگاه یا پنل دیگری متصل شده است');
      if ((await duplicates(app, tx)).length) throw new BusinessError(409, 'فروشگاه مشابه قبلاً ثبت شده است؛ ابتدا تداخل مالکیت را بررسی کنید');
      const hours = BusinessHoursSchema.parse(app.hours);
      const merchant = await tx.merchant.create({ data: {
        ownerUserId: applicant.id, businessNameFa: app.businessNameFa, businessType: app.businessType,
        licenseNumber: app.licenseNumber, mapirPlaceId: app.mapirPlaceId, verificationStatus: 'APPROVED', ratingAverage: 0,
        staff: { create: { userId: applicant.id, role: 'OWNER', canScanPickup: true } },
        locations: { create: { cityId: app.cityId, addressFa: app.addressFa, latitude: app.latitude, longitude: app.longitude, phone: app.phone,
          hours: { create: hours.map(h => ({ ...h, defaultPickupStart: null, defaultPickupEnd: null })) } } },
      } });
      merchantId = merchant.id;
      await tx.user.update({ where: { id: applicant.id }, data: { role: 'MERCHANT_OWNER', customer: { upsert: { create: { fullName: app.ownerName }, update: { fullName: app.ownerName } } } } });
    }
    const reviewed = await tx.merchantApplication.update({ where: { id }, data: { status: data.decision, reviewReason: data.reasonFa, reviewedById: adminId, reviewedAt: new Date(), merchantId }, include: { city: true } });
    await tx.auditLog.create({ data: { actorId: adminId, actorRole: 'ADMIN', action: 'MERCHANT_APPLICATION_' + data.decision, entityType: 'MERCHANT_APPLICATION', entityId: id, detailsJson: { reasonFa: data.reasonFa, revision: app.revision, merchantId } } });
    const isApproved = data.decision === 'APPROVED';
    notificationService.createNotification({
      userId: app.applicantId,
      role: isApproved ? 'MERCHANT_OWNER' : 'CUSTOMER',
      type: isApproved ? 'APPLICATION_APPROVED' : 'APPLICATION_REJECTED',
      category: 'system',
      title: isApproved ? 'تأیید درخواست ثبت فروشگاه' : 'عدم تأیید درخواست فروشگاه',
      body: isApproved
        ? 'درخواست ثبت فروشگاه «' + app.businessNameFa + '» با موفقیت تأیید شد و پنل مدیریت شما فعال گردید'
        : 'درخواست فروشگاه «' + app.businessNameFa + '» تایید نشد: ' + (data.reasonFa || 'عدم تطابق مدارک'),
      link: isApproved ? '/merchant' : '/business/application',
    }).catch(() => {});
    return dto(reviewed);
  });
}
