import { useDatabaseAdmin } from './helpers/database-admin';
useDatabaseAdmin();
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { reservationService } from '@/domain/reservation/reservation.service';
import { orderService } from '@/domain/order/order.service';
import { pickupService } from '@/domain/pickup/pickup.service';
import {
  ListingStatus,
  SafetyStatus,
  OrderStatus,
  Role,
} from '@prisma/client';

describe('Merchant Order Confirmation & Pickup Window Delay Management', () => {
  let customerUser: any;
  let merchantOwnerUser: any;
  let otherUser: any;
  let testListing: any;
  let testMerchant: any;

  beforeAll(async () => {
    // 1. Customer User
    customerUser = await prisma.user.upsert({
      where: { mobile: '09129990001' },
      update: {},
      create: {
        mobile: '09129990001',
        role: Role.CUSTOMER,
        customer: { create: { fullName: 'تست مشتری تاییدیه' } },
      },
      include: { customer: true },
    });

    // 2. Random Other User (unauthorized)
    otherUser = await prisma.user.upsert({
      where: { mobile: '09129990002' },
      update: {},
      create: {
        mobile: '09129990002',
        role: Role.CUSTOMER,
      },
    });

    // 3. Find published listing and its merchant owner
    testListing = await prisma.listing.findFirst({
      where: {
        status: ListingStatus.PUBLISHED,
        safety: { safetyStatus: SafetyStatus.APPROVED },
      },
      include: {
        merchant: {
          include: {
            owner: true,
            staff: true,
          },
        },
      },
    });

    expect(testListing).toBeDefined();
    testMerchant = testListing.merchant;
    merchantOwnerUser = testListing.merchant.owner;

    // Ensure valid active window and plenty of inventory for tests
    await prisma.listing.update({
      where: { id: testListing.id },
      data: {
        pickupStart: new Date(Date.now() - 3600 * 1000),
        pickupEnd: new Date(Date.now() + 86400 * 1000),
      },
    });

    await prisma.listingInventory.upsert({
      where: { listingId: testListing.id },
      update: { totalQuantity: 100, reservedQuantity: 0, soldQuantity: 0 },
      create: { listingId: testListing.id, totalQuantity: 100, reservedQuantity: 0, soldQuantity: 0 },
    });
  });

  it('sets merchantConfirmedAt to null upon payment completion and initializes default window', async () => {
    // Reserve item
    const hold = await reservationService.createReservation({
      customerId: customerUser.customer.id,
      listingId: testListing.id,
      quantity: 1,
    });
    expect(hold.success).toBe(true);

    // Create order
    const orderRes = await orderService.createOrderFromReservation({
      customerId: customerUser.customer.id,
      reservationId: hold.reservation!.id,
      callbackUrl: 'http://localhost:3000/callback',
      mobile: customerUser.mobile,
    });
    expect(orderRes.success).toBe(true);

    // Complete order payment
    const verifyRes = await orderService.verifyAndCompleteOrder({
      authority: orderRes.authority!,
    });
    expect(verifyRes.success).toBe(true);

    // Verify order database state
    const order = await prisma.order.findUnique({
      where: { id: orderRes.order!.id },
    });
    expect(order).toBeDefined();
    expect(order!.status).toBe(OrderStatus.READY_FOR_PICKUP);
    expect(order!.merchantConfirmedAt).toBeNull();
    expect(order!.pickupWindowModifiedCount).toBe(0);
    expect(order!.delayReasonFa).toBeNull();
    expect(order!.pickupStart).toBeDefined();
    expect(order!.pickupEnd).toBeDefined();

    // Verify customer order listing projection
    const customerOrders = await orderService.listCustomerOrders(customerUser.customer.id);
    const orderItem = customerOrders.find((o) => o.id === order!.id);
    expect(orderItem).toBeDefined();
    expect(orderItem!.isConfirmedByMerchant).toBe(false);
    expect(orderItem!.merchantConfirmedAt).toBeNull();
  });

  it('rejects confirmation by unauthorized users and succeeds for merchant owner', async () => {
    // Reserve & pay
    const hold = await reservationService.createReservation({
      customerId: customerUser.customer.id,
      listingId: testListing.id,
      quantity: 1,
    });
    const orderRes = await orderService.createOrderFromReservation({
      customerId: customerUser.customer.id,
      reservationId: hold.reservation!.id,
      callbackUrl: 'http://localhost:3000/callback',
    });
    await orderService.verifyAndCompleteOrder({ authority: orderRes.authority! });
    const orderId = orderRes.order!.id;

    // Unauthorized attempt
    const unauthorized = await orderService.confirmOrderByMerchant({
      merchantUserId: otherUser.id,
      orderId,
      estimatedPreparationMinutes: 25,
    });
    expect(unauthorized.success).toBe(false);
    expect(unauthorized.message).toMatch(/عدم دسترسی|سفارش مورد نظر یافت نشد/);

    // Authorized merchant confirmation
    const authorized = await orderService.confirmOrderByMerchant({
      merchantUserId: merchantOwnerUser.id,
      orderId,
      estimatedPreparationMinutes: 30,
      noteFa: 'سفارش در حال آماده‌سازی است',
    });
    expect(authorized.success).toBe(true);
    expect(authorized.order.merchantConfirmedAt).not.toBeNull();
    expect(authorized.order.confirmedByUserId).toBe(merchantOwnerUser.id);

    // Check DB state
    const updated = await prisma.order.findUnique({ where: { id: orderId } });
    expect(updated!.merchantConfirmedAt).not.toBeNull();
    expect(updated!.confirmedByUserId).toBe(merchantOwnerUser.id);

    // Check customer projection
    const customerOrders = await orderService.listCustomerOrders(customerUser.customer.id);
    const orderItem = customerOrders.find((o) => o.id === orderId);
    expect(orderItem!.isConfirmedByMerchant).toBe(true);
    expect(orderItem!.merchantConfirmedAt).not.toBeNull();

    // Check notification was created for customer
    const notif = await prisma.notification.findFirst({
      where: {
        userId: customerUser.id,
        type: 'ORDER_MERCHANT_CONFIRMED',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(notif).toBeDefined();
    expect(notif!.title).toContain('تایید شد');
  });

  it('updates pickup window with delay, tracks history and notifies customer', async () => {
    // Reserve & pay
    const hold = await reservationService.createReservation({
      customerId: customerUser.customer.id,
      listingId: testListing.id,
      quantity: 1,
    });
    const orderRes = await orderService.createOrderFromReservation({
      customerId: customerUser.customer.id,
      reservationId: hold.reservation!.id,
      callbackUrl: 'http://localhost:3000/callback',
    });
    await orderService.verifyAndCompleteOrder({ authority: orderRes.authority! });
    const orderId = orderRes.order!.id;

    // Confirm first
    await orderService.confirmOrderByMerchant({
      merchantUserId: merchantOwnerUser.id,
      orderId,
      estimatedPreparationMinutes: 30,
    });

    const beforeDelay = await prisma.order.findUnique({ where: { id: orderId } });
    const originalEnd = beforeDelay!.pickupEnd!;

    // Post delay (+20 minutes)
    const delayResult = await orderService.updateOrderPickupWindow({
      merchantUserId: merchantOwnerUser.id,
      orderId,
      delayMinutes: 20,
      reasonFa: 'ترافیک در آشپزخانه',
    });

    expect(delayResult.success).toBe(true);
    expect(delayResult.order.pickupWindowModifiedCount).toBe(1);
    expect(delayResult.order.delayReasonFa).toBe('ترافیک در آشپزخانه');

    // Pickup end must be 20 mins after previous end
    const newEnd = new Date(delayResult.order.pickupEnd).getTime();
    const expectedEnd = new Date(originalEnd).getTime() + 20 * 60 * 1000;
    expect(Math.abs(newEnd - expectedEnd)).toBeLessThanOrEqual(1000);

    // Audit history should contain 1 entry
    const history = delayResult.order.pickupWindowHistory as any[];
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(1);
    expect(history[0].delayMinutes).toBe(20);
    expect(history[0].reasonFa).toBe('ترافیک در آشپزخانه');
    expect(history[0].modifiedByUserId).toBe(merchantOwnerUser.id);

    // Verify delay notification was created
    const notif = await prisma.notification.findFirst({
      where: {
        userId: customerUser.id,
        type: 'ORDER_DELAYED',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(notif).toBeDefined();
    expect(notif!.title).toContain('اعلام تاخیر');
    expect(notif!.body).toContain('ترافیک در آشپزخانه');

    // Verify pickup queue projection includes delay fields
    const queue = await pickupService.getMerchantPickupQueue(merchantOwnerUser.id, testMerchant.id);
    const queueItem = queue.find((q) => q.orderId === orderId);
    expect(queueItem).toBeDefined();
    expect(queueItem!.isConfirmedByMerchant).toBe(true);
    expect(queueItem!.pickupWindowModifiedCount).toBe(1);
    expect(queueItem!.delayReasonFa).toBe('ترافیک در آشپزخانه');
  });

  it('prevents sweepNoShows from expiring an order whose pickup window was extended into the future', async () => {
    // 1. Create order
    const hold = await reservationService.createReservation({
      customerId: customerUser.customer.id,
      listingId: testListing.id,
      quantity: 1,
    });
    const orderRes = await orderService.createOrderFromReservation({
      customerId: customerUser.customer.id,
      reservationId: hold.reservation!.id,
      callbackUrl: 'http://localhost:3000/callback',
    });
    await orderService.verifyAndCompleteOrder({ authority: orderRes.authority! });
    const orderId = orderRes.order!.id;

    // 2. Set listing original window to past (so it would normally be swept)
    const past = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
    await prisma.listing.update({
      where: { id: testListing.id },
      data: { pickupEnd: past },
    });

    // 3. Merchant extends pickup window into future (+45 minutes from now)
    const future = new Date(Date.now() + 45 * 60 * 1000);
    await orderService.updateOrderPickupWindow({
      merchantUserId: merchantOwnerUser.id,
      orderId,
      pickupStart: new Date(),
      pickupEnd: future,
      reasonFa: 'پخت نان تازه',
    });

    // 4. Run sweepNoShows
    const sweepResult = await pickupService.sweepNoShows(testMerchant.id);
    expect(sweepResult.orderIds).not.toContain(orderId);

    // 5. Verify order is still READY_FOR_PICKUP and NOT NO_SHOW
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe(OrderStatus.READY_FOR_PICKUP);

    // Restore listing future window
    await prisma.listing.update({
      where: { id: testListing.id },
      data: { pickupEnd: new Date(Date.now() + 86400 * 1000) },
    });
  });
});
