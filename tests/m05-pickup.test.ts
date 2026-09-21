import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { pickupService } from '@/domain/pickup/pickup.service';
import { orderService } from '@/domain/order/order.service';
import { reservationService } from '@/domain/reservation/reservation.service';
import {
  ListingStatus,
  SafetyStatus,
  OrderStatus,
  Role,
  StaffRole,
} from '@prisma/client';

describe('Milestone M05 — Pickup Verification Engine', () => {
  describe('1. Dynamic Cryptographic QR Tokens (CP-05.1)', () => {
    it('generates a signed dynamic QR token with HMAC-SHA256 signature', () => {
      const orderId = 'test-order-1234';
      const token = pickupService.generateDynamicQrToken(orderId);

      expect(token).toBeDefined();
      const parts = token.split('.');
      expect(parts.length).toBe(2);

      // Decoded payload structure
      const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      expect(payload.orderId).toBe(orderId);
      expect(typeof payload.t).toBe('number');
      expect(typeof payload.nonce).toBe('string');
    });

    it('verifies a valid token within sliding validity window', () => {
      const orderId = 'test-order-5678';
      const token = pickupService.generateDynamicQrToken(orderId);

      const result = pickupService.verifyDynamicQrToken(token);
      expect(result.valid).toBe(true);
      expect(result.orderId).toBe(orderId);
    });

    it('rejects tampered tokens with invalid signatures', () => {
      const orderId = 'test-order-9999';
      const token = pickupService.generateDynamicQrToken(orderId);
      const parts = token.split('.');

      // Tamper with payload
      const tamperedPayload = Buffer.from(
        JSON.stringify({ orderId: 'hacked-order-id', t: Math.floor(Date.now() / 1000) })
      ).toString('base64url');

      const tamperedToken = `${tamperedPayload}.${parts[1]}`;
      const result = pickupService.verifyDynamicQrToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('امضای دیجیتال بارکد نامعتبر است');
    });

    it('rejects expired dynamic tokens (older than 180 seconds)', () => {
      const orderId = 'test-order-expired';
      // Token issued 4 minutes (240s) ago
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 240;
      const token = pickupService.generateDynamicQrToken(orderId, expiredTimestamp);

      const result = pickupService.verifyDynamicQrToken(token);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('منقضی');
    });
  });

  describe('2. 4-Digit Numeric OTP Generator (CP-05.1)', () => {
    it('generates a 4-digit numeric code', () => {
      const otp = pickupService.generateOtpCode();
      expect(otp).toMatch(/^\d{4}$/);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThan(10000);
    });
  });

  describe('Database Handshake & Concurrency Suite', () => {
    let testCustomerUserId: string;
    let testCustomerId: string;
    let testMerchantId: string;
    let testMerchantOwnerUserId: string;
    let testOtherMerchantUserId: string;
    let testListingId: string;

    beforeAll(async () => {
      // 1. Setup Customer User
      const customerUser = await prisma.user.upsert({
        where: { mobile: '09121115555' },
        update: {},
        create: {
          mobile: '09121115555',
          role: Role.CUSTOMER,
          customer: { create: { fullName: 'فرهاد مجیدی' } },
        },
        include: { customer: true },
      });
      testCustomerUserId = customerUser.id;
      testCustomerId = customerUser.customer!.id;

      // 2. Setup Merchant Owner User
      const merchantOwner = await prisma.user.upsert({
        where: { mobile: '09122225555' },
        update: {},
        create: {
          mobile: '09122225555',
          role: Role.MERCHANT_OWNER,
        },
      });
      testMerchantOwnerUserId = merchantOwner.id;

      // 3. Setup Another Merchant User (for cross-merchant isolation tests)
      const otherMerchantUser = await prisma.user.upsert({
        where: { mobile: '09123335555' },
        update: {},
        create: {
          mobile: '09123335555',
          role: Role.MERCHANT_OWNER,
        },
      });
      testOtherMerchantUserId = otherMerchantUser.id;

      // 4. Fetch an active listing from seed
      const listing = await prisma.listing.findFirst({
        where: {
          status: ListingStatus.PUBLISHED,
          safety: { safetyStatus: SafetyStatus.APPROVED },
        },
        include: { merchant: true },
      });

      expect(listing).toBeDefined();
      testListingId = listing!.id;
      testMerchantId = listing!.merchantId;

      // Ensure the test listing has an active pickup window and available inventory
      await prisma.listing.update({
        where: { id: testListingId },
        data: {
          pickupStart: new Date(Date.now() - 3600 * 1000),
          pickupEnd: new Date(Date.now() + 86400 * 1000),
        },
      });

      await prisma.listingInventory.upsert({
        where: { listingId: testListingId },
        update: { totalQuantity: 100, reservedQuantity: 0, soldQuantity: 0 },
        create: { listingId: testListingId, totalQuantity: 100, reservedQuantity: 0, soldQuantity: 0 },
      });

      // Ensure the merchant owner owns this merchant or is assigned
      await prisma.merchant.update({
        where: { id: testMerchantId },
        data: { ownerUserId: testMerchantOwnerUserId },
      });
    });

  describe('3. Atomic Verification Handshake & Order Completion (CP-05.5)', () => {
    let orderId: string;
    let orderNumber: string;

    beforeAll(async () => {
      // Create reservation and convert to paid order
      const reservation = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 1,
      });

      const checkoutRes = await orderService.createOrderFromReservation({
        reservationId: reservation.reservation!.id,
        customerId: testCustomerId,
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });

      orderId = checkoutRes.order.id;
      orderNumber = checkoutRes.order.orderNumber;

      // Mock payment verification to transition order to READY_FOR_PICKUP
      await orderService.verifyAndCompleteOrder({
        authority: checkoutRes.authority!,
      });
    });

    it('allows authorized merchant owner to complete pickup with dynamic QR token', async () => {
      const token = pickupService.generateDynamicQrToken(orderId);

      const verifyRes = await pickupService.verifyPickup({
        merchantUserId: testMerchantOwnerUserId,
        qrToken: token,
      });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.response.success).toBe(true);
      expect(verifyRes.response.status).toBe(OrderStatus.COMPLETED);

      // Verify order status in DB
      const dbOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { pickupVerification: true },
      });

      expect(dbOrder!.status).toBe(OrderStatus.COMPLETED);
      expect(dbOrder!.pickupVerification!.isVerified).toBe(true);
      expect(dbOrder!.pickupVerification!.verifiedAt).toBeDefined();
    });

    it('rejects double-pickup attempt with HTTP 409 Conflict', async () => {
      const token = pickupService.generateDynamicQrToken(orderId);

      const doubleRes = await pickupService.verifyPickup({
        merchantUserId: testMerchantOwnerUserId,
        qrToken: token,
      });

      expect(doubleRes.statusCode).toBe(409);
      expect(doubleRes.response.success).toBe(false);
      expect(doubleRes.response.alreadyVerified).toBe(true);
      expect(doubleRes.response.message).toContain('قبلاً');
    });
  });

  describe('4. Concurrency Stress Test — Double-Pickup Prevention (CP-05.5 / CP-05.7)', () => {
    it('guarantees that exactly 1 of 5 simultaneous verify requests succeeds and 4 fail with 409 Conflict', async () => {
      // 1. Create a fresh paid order
      const reservation = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 1,
      });

      const checkoutRes = await orderService.createOrderFromReservation({
        reservationId: reservation.reservation!.id,
        customerId: testCustomerId,
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });

      await orderService.verifyAndCompleteOrder({
        authority: checkoutRes.authority!,
      });

      const concurrentOrderId = checkoutRes.order.id;
      const token = pickupService.generateDynamicQrToken(concurrentOrderId);

      // 2. Fire 5 simultaneous verify requests for the exact same order token
      const promises = Array.from({ length: 5 }, () =>
        pickupService.verifyPickup({
          merchantUserId: testMerchantOwnerUserId,
          qrToken: token,
        })
      );

      const results = await Promise.all(promises);

      const successResults = results.filter((r) => r.statusCode === 200);
      const conflictResults = results.filter((r) => r.statusCode === 409);

      // Exactly 1 must succeed; 4 must fail with 409 Conflict
      expect(successResults.length).toBe(1);
      expect(conflictResults.length).toBe(4);

      // Verify database state is completed
      const finalOrder = await prisma.order.findUnique({
        where: { id: concurrentOrderId },
        include: { pickupVerification: true },
      });

      expect(finalOrder!.status).toBe(OrderStatus.COMPLETED);
      expect(finalOrder!.pickupVerification!.isVerified).toBe(true);
    });
  });

  describe('5. Cross-Merchant Security Isolation (CP-05.5)', () => {
    it('rejects pickup verification by staff/owner of an unrelated store with HTTP 403', async () => {
      // Create fresh paid order for Store A
      const reservation = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 1,
      });

      const checkoutRes = await orderService.createOrderFromReservation({
        reservationId: reservation.reservation!.id,
        customerId: testCustomerId,
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });

      await orderService.verifyAndCompleteOrder({
        authority: checkoutRes.authority!,
      });

      const token = pickupService.generateDynamicQrToken(checkoutRes.order.id);

      // Unrelated merchant attempts to verify Store A's order
      const res = await pickupService.verifyPickup({
        merchantUserId: testOtherMerchantUserId,
        qrToken: token,
      });

      expect(res.statusCode).toBe(403);
      expect(res.response.success).toBe(false);
      expect(res.response.message).toContain('متعلق به فروشگاه شما نمی‌باشد');
    });
  });

  describe('6. 4-Digit OTP Verification & Failed Attempt Lockout (CP-05.5)', () => {
    it('enforces 15-minute lockout after 5 consecutive incorrect OTP attempts', async () => {
      const reservation = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 1,
      });

      const checkoutRes = await orderService.createOrderFromReservation({
        reservationId: reservation.reservation!.id,
        customerId: testCustomerId,
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });

      await orderService.verifyAndCompleteOrder({
        authority: checkoutRes.authority!,
      });

      const testOrderId = checkoutRes.order.id;

      // Submit 4 incorrect OTPs
      for (let i = 1; i <= 4; i++) {
        const failRes = await pickupService.verifyPickup({
          merchantUserId: testMerchantOwnerUserId,
          orderId: testOrderId,
          otpCode: '0000', // incorrect OTP
        });
        expect(failRes.statusCode).toBe(400);
      }

      // 5th failed attempt should lock the verification
      const fifthRes = await pickupService.verifyPickup({
        merchantUserId: testMerchantOwnerUserId,
        orderId: testOrderId,
        otpCode: '0000',
      });

      expect(fifthRes.statusCode).toBe(400);
      expect(fifthRes.response.message).toContain('مسدود');

      // Subsequent attempt returns 429 Too Many Requests / Locked
      const lockedRes = await pickupService.verifyPickup({
        merchantUserId: testMerchantOwnerUserId,
        orderId: testOrderId,
        otpCode: '0000',
      });

      expect(lockedRes.statusCode).toBe(429);
      expect(lockedRes.response.message).toContain('مسدود است');
    });
  });

  describe('7. No-Show Sweeper Engine (CP-05.6)', () => {
    it('transitions unpicked orders with elapsed pickup window to NO_SHOW', async () => {
      // Create a paid order whose listing has pickupEnd in the past
      const pastListing = await prisma.listing.create({
        data: {
          merchantId: testMerchantId,
          categoryId: (await prisma.category.findFirst())!.id,
          titleFa: 'بسته منقضی شده تست',
          originalPriceToman: BigInt(100000),
          discountedPriceToman: BigInt(50000),
          pickupDate: new Date(Date.now() - 3600 * 1000),
          pickupStart: new Date(Date.now() - 7200 * 1000),
          pickupEnd: new Date(Date.now() - 1800 * 1000), // Ended 30 mins ago
          status: ListingStatus.PUBLISHED,
          inventory: {
            create: { totalQuantity: 10, reservedQuantity: 0, soldQuantity: 1 },
          },
        },
      });

      const pastOrder = await prisma.order.create({
        data: {
          orderNumber: `LQ-TEST-NOSHOW-${Date.now()}`,
          customerId: testCustomerId,
          merchantId: testMerchantId,
          status: OrderStatus.READY_FOR_PICKUP,
          totalAmountToman: BigInt(50000),
          items: {
            create: {
              listingId: pastListing.id,
              unitPriceToman: BigInt(50000),
              quantity: 1,
              subtotalToman: BigInt(50000),
            },
          },
        },
      });

      await pickupService.getOrCreateVerification(pastOrder.id);

      // Run no-show sweep
      const sweepResult = await pickupService.sweepNoShows();
      expect(sweepResult.success).toBe(true);
      expect(sweepResult.orderIds).toContain(pastOrder.id);

      // Verify order status updated to NO_SHOW in DB
      const updatedOrder = await prisma.order.findUnique({
        where: { id: pastOrder.id },
      });

      expect(updatedOrder!.status).toBe(OrderStatus.NO_SHOW);
    });
  });
});
});
