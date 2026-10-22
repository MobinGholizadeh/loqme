import { useDatabaseAdmin } from './helpers/database-admin';
useDatabaseAdmin();
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { reservationService } from '@/domain/reservation/reservation.service';
import { orderService } from '@/domain/order/order.service';
import { paymentService } from '@/domain/payment/payment.service';
import { inventoryService } from '@/domain/inventory/inventory.service';
import {
  ListingStatus,
  SafetyStatus,
  ReservationStatus,
  OrderStatus,
  PaymentGatewayType,
  FinancialTransactionType,
  Role,
} from '@prisma/client';

describe('Milestone M04 — Orders, Inventory & Payments Engine', () => {
  let testCustomerId: string;
  let testUserId: string;
  let testListingId: string;
  let testMerchantId: string;

  beforeAll(async () => {
    // 1. Fetch or create a test customer user
    const customerUser = await prisma.user.upsert({
      where: { mobile: '09121111111' },
      update: {},
      create: {
        mobile: '09121111111',
        role: Role.CUSTOMER,
        customer: { create: { fullName: 'سارا محمدی' } },
      },
      include: { customer: true },
    });

    testUserId = customerUser.id;
    testCustomerId = customerUser.customer!.id;

    // 2. Fetch an active listing from seed (e.g. from Urmia)
    const listing = await prisma.listing.findFirst({
      where: {
        status: ListingStatus.PUBLISHED,
        safety: { safetyStatus: SafetyStatus.APPROVED },
        pickupEnd: { gt: new Date() },
      },
      include: { inventory: true, merchant: true },
    });

    expect(listing).toBeDefined();
    testListingId = listing!.id;
    testMerchantId = listing!.merchantId;
  });

  describe('1. Atomic Reservation Engine (CP-04.1)', () => {
    it('creates a 10-minute hold and decrements available inventory atomically', async () => {
      const initialInv = await inventoryService.getInventory(testListingId);
      expect(initialInv).toBeDefined();
      const initialAvailable = initialInv!.availableQuantity;
      const initialReserved = initialInv!.reservedQuantity;

      // Create reservation for 1 unit
      const result = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 1,
      });

      expect(result.success).toBe(true);
      expect(result.reservation).toBeDefined();
      expect(result.reservation!.quantity).toBe(1);
      expect(result.reservation!.remainingSeconds).toBeGreaterThan(500);

      // Verify inventory lock
      const updatedInv = await inventoryService.getInventory(testListingId);
      expect(updatedInv!.reservedQuantity).toBe(initialReserved + 1);
      expect(updatedInv!.availableQuantity).toBe(initialAvailable - 1);

      // Idempotent check: same customer reserving same listing returns existing hold
      const duplicateResult = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 1,
      });
      expect(duplicateResult.success).toBe(true);
      expect(duplicateResult.reservation!.id).toBe(result.reservation!.id);

      // Cleanup reservation for next tests
      await reservationService.cancelReservation(result.reservation!.id, testCustomerId);

      const cleanedInv = await inventoryService.getInventory(testListingId);
      expect(cleanedInv!.reservedQuantity).toBe(initialReserved);
      expect(cleanedInv!.availableQuantity).toBe(initialAvailable);
    });

    it('rejects reservation if requested quantity is non-positive or exceeds maximum allowed', async () => {
      const zeroResult = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 0,
      });
      expect(zeroResult.success).toBe(false);

      const excessiveResult = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 10,
      });
      expect(excessiveResult.success).toBe(false);
    });

    it('auto-releases expired reservations back to available inventory on sweep', async () => {
      const initialInv = await inventoryService.getInventory(testListingId);
      const initialReserved = initialInv!.reservedQuantity;

      // Lock 1 unit
      await inventoryService.atomicReserve(testListingId, 1);

      // Create an already-expired reservation in DB
      const expiredRes = await prisma.reservation.create({
        data: {
          customerId: testCustomerId,
          listingId: testListingId,
          quantity: 1,
          expiresAt: new Date(Date.now() - 1000), // in the past
          status: ReservationStatus.PENDING,
        },
      });

      // Sweep expired
      const sweptCount = await reservationService.sweepExpiredReservations();
      expect(sweptCount).toBeGreaterThanOrEqual(1);

      const refreshed = await prisma.reservation.findUnique({ where: { id: expiredRes.id } });
      expect(refreshed!.status).toBe(ReservationStatus.EXPIRED);

      const postSweepInv = await inventoryService.getInventory(testListingId);
      expect(postSweepInv!.reservedQuantity).toBe(initialReserved);
    });
  });

  describe('2. Order Creation & Commission Math (CP-04.5 & CP-04.6)', () => {
    it('creates an order from a reservation with exact 10% platform commission and 90% merchant payout', async () => {
      // 1. Create a fresh reservation
      const resResult = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 2,
      });
      expect(resResult.success).toBe(true);
      const reservationId = resResult.reservation!.id;

      // 2. Create order from reservation
      const orderResult = await orderService.createOrderFromReservation({
        customerId: testCustomerId,
        reservationId,
        gateway: PaymentGatewayType.MOCK,
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });

      expect(orderResult.success).toBe(true);
      expect(orderResult.order).toBeDefined();
      expect(orderResult.order.orderNumber).toMatch(/^LQ-[0-9A-F]{12}$/);
      expect(orderResult.order.status).toBe(OrderStatus.PENDING_PAYMENT);

      const totalAmount = Number(orderResult.order.totalAmountToman);
      const commission = Number(orderResult.order.commissionAmountToman);
      const payout = Number(orderResult.order.merchantPayoutAmountToman);

      expect(totalAmount).toBeGreaterThan(0);
      expect(commission).toBe(Math.round(totalAmount * 0.1));
      expect(payout).toBe(totalAmount - commission);
      expect(commission + payout).toBe(totalAmount);

      // Clean up reservation & order
      await prisma.orderItem.deleteMany({ where: { orderId: orderResult.order.id } });
      await prisma.payment.deleteMany({ where: { orderId: orderResult.order.id } });
      await prisma.order.delete({ where: { id: orderResult.order.id } });
      await reservationService.cancelReservation(reservationId, testCustomerId);
    });
  });

  describe('3. Payment Gateway Verification & Ledger Integration (CP-04.3 & CP-04.4)', () => {
    it('completes the entire checkout lifecycle: reserve → pay → ledger → inventory confirmation', async () => {
      const invBefore = await inventoryService.getInventory(testListingId);
      const soldBefore = invBefore!.soldQuantity;

      // 1. Hold stock
      const hold = await reservationService.createReservation({
        customerId: testCustomerId,
        listingId: testListingId,
        quantity: 1,
      });
      expect(hold.success).toBe(true);

      // 2. Checkout
      const checkout = await orderService.createOrderFromReservation({
        customerId: testCustomerId,
        reservationId: hold.reservation!.id,
        gateway: PaymentGatewayType.MOCK,
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });
      expect(checkout.success).toBe(true);
      expect(checkout.authority).toBeDefined();

      // 3. Verify payment via Mock Gateway
      const verify = await orderService.verifyAndCompleteOrder({
        authority: checkout.authority!,
        trackingCode: 'TRK-TEST-99',
      });

      expect(verify.success).toBe(true);
      expect(verify.order.status).toBe(OrderStatus.READY_FOR_PICKUP);
      expect(verify.referenceId).toBeDefined();

      // 4. Verify reservation transitioned to CONVERTED_TO_ORDER
      const updatedRes = await prisma.reservation.findUnique({
        where: { id: hold.reservation!.id },
      });
      expect(updatedRes!.status).toBe(ReservationStatus.CONVERTED_TO_ORDER);

      // 5. Verify inventory confirmed as sold
      const invAfter = await inventoryService.getInventory(testListingId);
      expect(invAfter!.soldQuantity).toBe(soldBefore + 1);

      // 6. Verify double-entry financial ledger records
      const ledgerEntries = await prisma.financialTransaction.findMany({
        where: { orderId: verify.order.id },
      });
      expect(ledgerEntries.length).toBe(3);

      const customerPayment = ledgerEntries.find((e) => e.type === FinancialTransactionType.CUSTOMER_PAYMENT);
      const merchantPayout = ledgerEntries.find((e) => e.type === FinancialTransactionType.MERCHANT_PAYOUT);
      const commission = ledgerEntries.find((e) => e.type === FinancialTransactionType.COMMISSION_EARNED);

      expect(customerPayment).toBeDefined();
      expect(merchantPayout).toBeDefined();
      expect(commission).toBeDefined();

      expect(Number(customerPayment!.amountToman)).toBe(
        Number(merchantPayout!.amountToman) + Number(commission!.amountToman)
      );

      // 7. Test Idempotency: calling verify again returns success without double-crediting
      const repeatVerify = await orderService.verifyAndCompleteOrder({
        authority: checkout.authority!,
      });
      expect(repeatVerify.success).toBe(true);

      const repeatLedger = await prisma.financialTransaction.findMany({
        where: { orderId: verify.order.id },
      });
      expect(repeatLedger.length).toBe(3); // no duplicate records
    });

    it('rejects verification if authority token is unknown or invalid', async () => {
      const result = await orderService.verifyAndCompleteOrder({
        authority: 'INVALID-FAKE-AUTHORITY-XYZ',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('4. High-Concurrency Stress Test — Zero Overselling Guarantee (CP-04.7)', () => {
    it('guarantees zero overselling when 20 simultaneous threads attempt to reserve the last 2 items', async () => {
      // 1. Create an isolated stress-test listing with totalQuantity = 2
      const stressListing = await prisma.listing.create({
        data: {
          merchantId: testMerchantId,
          categoryId: (await prisma.category.findFirst())!.id,
          titleFa: 'بسته تست همزمانی شدید (Concurrency Test)',
          originalPriceToman: BigInt(100000),
          discountedPriceToman: BigInt(50000),
          pickupDate: new Date(),
          pickupStart: new Date(),
          pickupEnd: new Date(Date.now() + 24 * 3600 * 1000),
          status: ListingStatus.PUBLISHED,
          inventory: {
            create: {
              totalQuantity: 2, // Exactly 2 units available
              reservedQuantity: 0,
              soldQuantity: 0,
              version: 1,
            },
          },
          safety: {
            create: {
              safetyStatus: SafetyStatus.APPROVED,
            },
          },
        },
      });

      // 2. Prepare 20 distinct simulated customer IDs
      const concurrentUsers = await Promise.all(
        Array.from({ length: 20 }, async (_, i) => {
          const mobile = `099900000${i < 10 ? '0' + i : i}`;
          const user = await prisma.user.upsert({
            where: { mobile },
            update: {},
            create: {
              mobile,
              role: Role.CUSTOMER,
              customer: { create: { fullName: `خریدار همزمان ${i + 1}` } },
            },
            include: { customer: true },
          });
          return user.customer!.id;
        })
      );

      // 3. Fire 20 simultaneous reservation requests at the exact same millisecond
      const reservationPromises = concurrentUsers.map((customerId) =>
        reservationService.createReservation({
          customerId,
          listingId: stressListing.id,
          quantity: 1,
        })
      );

      const results = await Promise.all(reservationPromises);

      const successfulHolds = results.filter((r) => r.success);
      const failedHolds = results.filter((r) => !r.success);

      // 4. Assert strict concurrency defense
      expect(successfulHolds.length).toBe(2);
      expect(failedHolds.length).toBe(18);

      // 5. Verify database inventory state
      const finalInv = await inventoryService.getInventory(stressListing.id);
      expect(finalInv!.reservedQuantity).toBe(2);
      expect(finalInv!.availableQuantity).toBe(0);
      expect(finalInv!.soldQuantity).toBe(0);
      expect(finalInv!.totalQuantity).toBe(2);

      // Cleanup stress listing
      await prisma.reservation.deleteMany({ where: { listingId: stressListing.id } });
      await prisma.listingInventory.delete({ where: { listingId: stressListing.id } });
      await prisma.listingSafety.delete({ where: { listingId: stressListing.id } });
      await prisma.listing.delete({ where: { id: stressListing.id } });
    });
  });
});
