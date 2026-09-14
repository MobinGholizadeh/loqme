import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  AdminMerchantAccountSchema,
  type AdminMerchantAccountInput,
} from "@loqme/validation";
import type { AdminMerchantAccountDto } from "@loqme/types";

export async function assertActiveAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });
  if (user?.role !== "ADMIN" || !user.isActive)
    throw new Error("عدم دسترسی: حساب مدیریت فعال لازم است");
}

export async function getMerchantAccount(
  adminId: string,
  merchantId: string,
  page = 1,
): Promise<AdminMerchantAccountDto> {
  await assertActiveAdmin(adminId);
  const pageSize = 20;
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      owner: {
        include: { customer: true, _count: { select: { ownedStores: true } } },
      },
      staff: { include: { user: { include: { customer: true } } } },
      orders: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: true,
          items: { include: { listing: { select: { titleFa: true } } } },
        },
      },
      _count: { select: { orders: true } },
    },
  });
  if (!merchant) throw new Error("فروشگاه یافت نشد");
  return {
    id: merchant.id,
    businessNameFa: merchant.businessNameFa,
    verificationStatus: merchant.verificationStatus,
    owner: {
      id: merchant.owner.id,
      mobile: merchant.owner.mobile,
      fullName: merchant.owner.customer?.fullName || "",
      role: merchant.owner.role,
      isActive: merchant.owner.isActive,
      ownedStoreCount: merchant.owner._count.ownedStores,
    },
    staff: merchant.staff.map((staff) => ({
      id: staff.user.id,
      mobile: staff.user.mobile,
      fullName: staff.user.customer?.fullName || "",
      role: staff.role,
      isActive: staff.user.isActive,
    })),
    orders: merchant.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      customerName: order.customer.fullName || "مشتری",
      totalAmountToman: Number(order.totalAmountToman),
      items: order.items.map((item) => ({
        titleFa: item.listing.titleFa,
        quantity: item.quantity,
      })),
    })),
    totalOrders: merchant._count.orders,
    page,
    pageSize,
  };
}

export async function updateMerchantAccount(
  adminId: string,
  merchantId: string,
  input: AdminMerchantAccountInput,
) {
  await assertActiveAdmin(adminId);
  const data = AdminMerchantAccountSchema.parse(input);
  return prisma.$transaction(
    async (tx) => {
      const merchant = await tx.merchant.findUnique({
        where: { id: merchantId },
        include: {
          owner: {
            include: {
              customer: true,
              _count: { select: { ownedStores: true } },
            },
          },
        },
      });
      if (!merchant) throw new Error("فروشگاه یافت نشد");
      if (merchant.ownerUserId !== data.expectedOwnerId)
        throw new Error("مالک فروشگاه تغییر کرده است؛ صفحه را تازه کنید");
      const oldOwner = merchant.owner;
      let newOwnerId = oldOwner.id;
      if (data.action === "UPDATE_ACCOUNT") {
        if (oldOwner.role !== "MERCHANT_OWNER" || oldOwner.id === adminId)
          throw new Error(
            "این حساب، حساب فروشنده نیست؛ یک حساب مستقل متصل کنید",
          );
        if (oldOwner._count.ownedStores > 1)
          throw new Error(
            "حساب به چند فروشگاه متصل است؛ ابتدا حساب مستقلی برای این فروشگاه تعیین کنید",
          );
        await tx.user.update({
          where: { id: oldOwner.id },
          data: {
            isActive: data.isActive,
            customer: {
              upsert: {
                create: { fullName: data.fullName },
                update: { fullName: data.fullName },
              },
            },
          },
        });
      } else {
        const existing = await tx.user.findUnique({
          where: { mobile: data.mobile },
          include: {
            ownedStores: { select: { id: true } },
            staffRoles: { select: { merchantId: true } },
          },
        });
        if (existing?.role === "ADMIN" || existing?.id === adminId)
          throw new Error("حساب مدیر نمی‌تواند حساب فروشگاه باشد");
        if (
          existing &&
          (existing.ownedStores.some((store) => store.id !== merchantId) ||
            existing.staffRoles.some(
              (staff) => staff.merchantId !== merchantId,
            ))
        )
          throw new Error(
            "این شماره به فروشگاه دیگری متصل است؛ شماره مستقل وارد کنید",
          );
        if (existing && !existing.isActive)
          throw new Error("حساب انتخاب‌شده غیرفعال است");
        const account = existing
          ? await tx.user.update({
              where: { id: existing.id },
              data: {
                role: "MERCHANT_OWNER",
                customer: {
                  upsert: {
                    create: { fullName: data.fullName },
                    update: { fullName: data.fullName },
                  },
                },
              },
            })
          : await tx.user.create({
              data: {
                mobile: data.mobile,
                role: "MERCHANT_OWNER",
                customer: { create: { fullName: data.fullName } },
              },
            });
        newOwnerId = account.id;
        await tx.merchant.update({
          where: { id: merchantId },
          data: { ownerUserId: account.id },
        });
        if (oldOwner.id !== account.id)
          await tx.merchantStaff.deleteMany({
            where: { merchantId, userId: oldOwner.id },
          });
        await tx.merchantStaff.upsert({
          where: { merchantId_userId: { merchantId, userId: account.id } },
          create: {
            merchantId,
            userId: account.id,
            role: "OWNER",
            canScanPickup: true,
          },
          update: { role: "OWNER", canScanPickup: true },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          actorRole: "ADMIN",
          action: `ADMIN_MERCHANT_${data.action}`,
          entityType: "MERCHANT",
          entityId: merchantId,
          detailsJson: {
            previousOwnerId: oldOwner.id,
            newOwnerId,
            previousActive: oldOwner.isActive,
            newActive: data.action === "UPDATE_ACCOUNT" ? data.isActive : true,
            reasonFa: data.reasonFa,
          },
        },
      });
      return { success: true, message: "حساب فروشگاه به‌روزرسانی شد" };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
