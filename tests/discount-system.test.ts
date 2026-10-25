import { describe, it, expect, beforeEach } from 'vitest';
import { DiscountEngine } from '@/domain/discount/discount-engine';
import { discountService } from '@/domain/discount/discount.service';
import { orderService } from '@/domain/order/order.service';
import { reservationService } from '@/domain/reservation/reservation.service';
import { prisma } from '@/lib/prisma';
import { withDatabaseActor, withDatabaseService } from '@/lib/db/context';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adminUrl = process.env.DATABASE_MIGRATION_URL;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: adminUrl }) });

describe('Discount System Acceptance Tests', () => {
  describe('DiscountEngine Unit Calculations', () => {
    it('normalizes coupon codes removing whitespace and converting Persian digits to uppercase English', () => {
      expect(DiscountEngine.normalizeCouponCode('  lq-spring-۱۲۳  ')).toBe('LQ-SPRING-123');
      expect(DiscountEngine.normalizeCouponCode('نوروز')).toBe('نوروز');
      expect(DiscountEngine.normalizeCouponCode(null)).toBe('');
    });

    it('determines correct operational status based on time and capacity', () => {
      const now = new Date();
      expect(
        DiscountEngine.getOperationalStatus({
          isActive: false,
          startsAt: new Date(now.getTime() - 10000),
          currentUses: 0,
        })
      ).toBe('INACTIVE');

      expect(
        DiscountEngine.getOperationalStatus({
          isActive: true,
          startsAt: new Date(now.getTime() + 100000),
          currentUses: 0,
        })
      ).toBe('SCHEDULED');

      expect(
        DiscountEngine.getOperationalStatus({
          isActive: true,
          startsAt: new Date(now.getTime() - 100000),
          expiresAt: new Date(now.getTime() - 1000),
          currentUses: 0,
        })
      ).toBe('EXPIRED');

      expect(
        DiscountEngine.getOperationalStatus({
          isActive: true,
          startsAt: new Date(now.getTime() - 100000),
          maxUses: 10,
          currentUses: 10,
        })
      ).toBe('DEPLETED');

      expect(
        DiscountEngine.getOperationalStatus({
          isActive: true,
          startsAt: new Date(now.getTime() - 100000),
          maxUses: 10,
          currentUses: 5,
        })
      ).toBe('ACTIVE');
    });

    it('calculates percentage discounts with optional maximum cap and integer precision', () => {
      // 20% on 100,000 Toman = 20,000 Toman
      const disc20 = {
        discountType: 'PERCENTAGE' as const,
        discountPercent: 20,
        discountAmountToman: null,
        maxDiscountAmountToman: null,
      };
      expect(DiscountEngine.calculateDiscountAmount(disc20, BigInt(100000))).toBe(BigInt(20000));

      // 50% on 100,000 Toman capped at 30,000 Toman
      const cappedDisc = {
        discountType: 'PERCENTAGE' as const,
        discountPercent: 50,
        discountAmountToman: null,
        maxDiscountAmountToman: BigInt(30000),
      };
      expect(DiscountEngine.calculateDiscountAmount(cappedDisc, BigInt(100000))).toBe(BigInt(30000));

      // Fixed amount discount cannot exceed subtotal
      const fixedDisc = {
        discountType: 'FIXED_AMOUNT' as const,
        discountPercent: null,
        discountAmountToman: BigInt(50000),
        maxDiscountAmountToman: null,
      };
      expect(DiscountEngine.calculateDiscountAmount(fixedDisc, BigInt(20000))).toBe(BigInt(20000));
      expect(DiscountEngine.calculateDiscountAmount(fixedDisc, BigInt(100000))).toBe(BigInt(50000));
    });

    it('enforces scope and eligibility boundaries', () => {
      const discount: any = {
        id: 'd1',
        titleFa: 'تخفیف رستوران الف',
        ownerType: 'MERCHANT',
        merchantId: 'm1',
        discountType: 'PERCENTAGE',
        discountPercent: 10,
        applicationMethod: 'COUPON_CODE',
        scope: 'MERCHANT',
        startsAt: new Date(Date.now() - 10000),
        currentUses: 0,
        maxUses: 100,
        maxUsesPerCustomer: 1,
        minOrderAmountToman: BigInt(50000),
        isActive: true,
        fundingSource: 'MERCHANT',
      };

      // Wrong merchant
      const wrongMerchant = DiscountEngine.checkEligibility(discount, {
        merchantId: 'm2',
        listingId: 'l1',
        subtotalToman: BigInt(60000),
      });
      expect(wrongMerchant.eligible).toBe(false);
      expect(wrongMerchant.errorCode).toBe('MERCHANT_MISMATCH');

      // Below minimum order amount
      const lowAmount = DiscountEngine.checkEligibility(discount, {
        merchantId: 'm1',
        listingId: 'l1',
        subtotalToman: BigInt(30000),
      });
      expect(lowAmount.eligible).toBe(false);
      expect(lowAmount.errorCode).toBe('MIN_ORDER_NOT_MET');

      // Exceeded customer usage limit
      const alreadyUsed = DiscountEngine.checkEligibility(discount, {
        merchantId: 'm1',
        listingId: 'l1',
        subtotalToman: BigInt(60000),
        customerUsageCount: 1,
      });
      expect(alreadyUsed.eligible).toBe(false);
      expect(alreadyUsed.errorCode).toBe('LIMIT_REACHED');

      // Valid
      const valid = DiscountEngine.checkEligibility(discount, {
        merchantId: 'm1',
        listingId: 'l1',
        subtotalToman: BigInt(60000),
        customerUsageCount: 0,
      });
      expect(valid.eligible).toBe(true);
    });
  });

  describe('Discount Service and Checkout Flow Integration', () => {
    let adminUserId: string;
    let merchantOwnerUserId: string;
    let merchantId: string;
    let customerUserId: string;
    let customerId: string;
    let listingId: string;

    beforeEach(async () => {
      const adminUser = await db.user.create({
        data: {
          mobile: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
          role: 'ADMIN',
        },
      });
      adminUserId = adminUser.id;

      const ownerUser = await db.user.create({
        data: {
          mobile: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
          role: 'MERCHANT_OWNER',
        },
      });
      merchantOwnerUserId = ownerUser.id;

      const customerUser = await db.user.create({
        data: {
          mobile: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
          role: 'CUSTOMER',
          customer: { create: { fullName: 'خریدار هوشمند' } },
        },
        include: { customer: true },
      });
      customerUserId = customerUser.id;
      customerId = customerUser.customer!.id;

      const merchant = await db.merchant.create({
        data: {
          businessNameFa: `فروشگاه آزمون ${randomUUID().slice(0, 6)}`,
          ownerUserId: merchantOwnerUserId,
          verificationStatus: 'APPROVED',
          commissionPercent: 10,
        },
      });
      merchantId = merchant.id;

      const category = (await db.category.findFirst()) || (await db.category.create({
        data: { nameFa: 'نان و شیرینی', slug: `bakery-${randomUUID().slice(0, 6)}` },
      }));

      const listing = await db.listing.create({
        data: {
          merchantId,
          categoryId: category.id,
          titleFa: 'بسته سوپرایز عصرانه',
          originalPriceToman: BigInt(100000),
          discountedPriceToman: BigInt(50000),
          status: 'PUBLISHED',
          pickupDate: new Date(),
          pickupStart: new Date(Date.now() - 60000),
          pickupEnd: new Date(Date.now() + 3600000),
          inventory: { create: { totalQuantity: 10 } },
          safety: { create: { safetyStatus: 'APPROVED', allergens: [], dietaryTags: [] } },
        },
      });
      listingId = listing.id;
    });

    it('creates admin platform-wide coupon and validates it successfully', async () => {
      const code = `TEST-${randomUUID().slice(0, 6).toUpperCase()}`;
      const res = await discountService.createDiscount(adminUserId, 'ADMIN', {
        code,
        titleFa: 'تخفیف ۲۰ درصدی افتتاحیه',
        discountType: 'PERCENTAGE',
        discountPercent: 20,
        scope: 'PLATFORM',
        fundingSource: 'PLATFORM',
      });

      expect(res.success).toBe(true);
      expect(res.discount?.code).toBe(code);

      // Validate coupon
      const val = await discountService.validateCoupon({
        code,
        customerId,
        merchantId,
        listingId,
        subtotalToman: 50000,
      });

      expect(val.valid).toBe(true);
      expect(val.discountAmountToman).toBe(10000); // 20% of 50,000 = 10,000
      expect(val.finalAmountToman).toBe(40000);
    });

    it('prevents merchants from creating platform-wide or category-wide discounts', async () => {
      const res = await discountService.createDiscount(merchantOwnerUserId, 'MERCHANT_OWNER', {
        code: `FAIL-${randomUUID().slice(0, 4)}`,
        titleFa: 'تخفیف غیرمجاز',
        discountType: 'PERCENTAGE',
        discountPercent: 10,
        scope: 'PLATFORM',
        merchantId,
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('سراسری');
    });

    it('allows merchant to create store coupon and applies it correctly', async () => {
      const code = `STORE-${randomUUID().slice(0, 4).toUpperCase()}`;
      const res = await discountService.createDiscount(merchantOwnerUserId, 'MERCHANT_OWNER', {
        code,
        titleFa: 'تخفیف ویژه فروشگاه ما',
        discountType: 'FIXED_AMOUNT',
        discountAmountToman: 15000,
        scope: 'MERCHANT',
        merchantId,
        fundingSource: 'MERCHANT',
      });

      expect(res.success).toBe(true);

      const val = await discountService.validateCoupon({
        code,
        customerId,
        merchantId,
        listingId,
        subtotalToman: 50000,
      });

      expect(val.valid).toBe(true);
      expect(val.discountAmountToman).toBe(15000);
      expect(val.finalAmountToman).toBe(35000);
    });

    it('bulk generates unique discount coupons for marketing campaigns', async () => {
      const bulkRes = await discountService.bulkGenerateDiscounts(adminUserId, 'ADMIN', {
        prefix: 'BULK',
        count: 5,
        titleFa: 'کارت هدیه اختصاصی',
        discountType: 'PERCENTAGE',
        discountPercent: 15,
        maxUsesPerCode: 1,
      });

      expect(bulkRes.success).toBe(true);
      expect(bulkRes.codes).toHaveLength(5);
      expect(bulkRes.codes.every((c) => c.startsWith('BULK-'))).toBe(true);
    });

    it('applies discount during checkout, creates DiscountRedemption, and increments uses atomically', async () => {
      const code = `ORDER-${randomUUID().slice(0, 6).toUpperCase()}`;
      await discountService.createDiscount(adminUserId, 'ADMIN', {
        code,
        titleFa: 'تخفیف تست سفارش',
        discountType: 'PERCENTAGE',
        discountPercent: 10,
        scope: 'PLATFORM',
        maxUses: 1, // Single use overall
        maxUsesPerCustomer: 1,
      });

      // 1. Reserve item
      const hold = await withDatabaseActor(customerUserId, () =>
        reservationService.createReservation({
          customerId,
          listingId,
          quantity: 1,
        })
      );
      expect(hold.success).toBe(true);

      // 2. Checkout with coupon
      const orderRes = await withDatabaseActor(customerUserId, () =>
        orderService.createOrderFromReservation({
          customerId,
          reservationId: hold.reservation!.id,
          gateway: 'MOCK',
          callbackUrl: 'http://localhost/callback',
          couponCode: code,
        })
      );

      expect(orderRes.success).toBe(true);
      expect(orderRes.order).toBeDefined();

      // Verify Order persisted discount snapshot
      const order = await db.order.findUnique({
        where: { id: orderRes.order.id },
      });
      expect(order?.discountCode).toBe(code);
      expect(order?.discountAmountToman).toBe(BigInt(5000)); // 10% of 50,000 = 5,000
      expect(order?.totalAmountToman).toBe(BigInt(45000));

      // Verify redemption record exists
      const redemption = await db.discountRedemption.findFirst({
        where: { orderId: order!.id },
      });
      expect(redemption).toBeDefined();
      expect(redemption?.customerId).toBe(customerId);
      expect(redemption?.discountAmountToman).toBe(BigInt(5000));

      // Verify currentUses incremented to 1
      const discountRecord = await db.discount.findUnique({
        where: { code },
      });
      expect(discountRecord?.currentUses).toBe(1);

      // Mark first reservation as converted so customer can make a fresh reservation
      await db.reservation.update({
        where: { id: hold.reservation!.id },
        data: { status: 'CONVERTED_TO_ORDER' },
      });

      // Subsequent attempt with exhausted single-use coupon fails
      const hold2 = await withDatabaseActor(customerUserId, () =>
        reservationService.createReservation({
          customerId,
          listingId,
          quantity: 1,
        })
      );
      expect(hold2.success).toBe(true);
      expect(hold2.reservation?.id).not.toBe(hold.reservation?.id);

      const secondOrder = await withDatabaseActor(customerUserId, () =>
        orderService.createOrderFromReservation({
          customerId,
          reservationId: hold2.reservation!.id,
          gateway: 'MOCK',
          callbackUrl: 'http://localhost/callback',
          couponCode: code,
        })
      );
      expect(secondOrder.success).toBe(false);
      expect(secondOrder.message).toContain('ظرفیت استفاده');
    });
  });
});
