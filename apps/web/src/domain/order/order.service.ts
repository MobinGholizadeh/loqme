import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/domain/inventory/inventory.service';
import { paymentService } from '@/domain/payment/payment.service';
import { pickupService } from '@/domain/pickup/pickup.service';
import {
  OrderStatus,
  ReservationStatus,
  PaymentGatewayType,
  FinancialTransactionType,
  SafetyStatus,
} from '@prisma/client';

export interface CreateOrderResult {
  success: boolean;
  message?: string;
  order?: any;
  paymentUrl?: string;
  authority?: string;
}

export interface VerifyOrderPaymentResult {
  success: boolean;
  message?: string;
  order?: any;
  referenceId?: string;
  orderNumber?: string;
}

export class OrderService {
  /**
   * Creates an order from a verified, active reservation hold and initiates payment
   */
  async createOrderFromReservation(params: {
    customerId: string;
    reservationId: string;
    gateway?: PaymentGatewayType;
    notesFa?: string;
    callbackUrl: string;
    mobile?: string;
  }): Promise<CreateOrderResult> {
    const { customerId, reservationId, notesFa, callbackUrl, mobile } = params;
    const gateway = params.gateway ?? (process.env.NODE_ENV === 'production' ? PaymentGatewayType.ZARINPAL : PaymentGatewayType.MOCK);
    const prepared = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Reservation" WHERE id=${reservationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT l.id FROM "Listing" l JOIN "Reservation" r ON r."listingId"=l.id WHERE r.id=${reservationId} FOR SHARE OF l`;
      const reservation = await tx.reservation.findUnique({ where: { id: reservationId }, include: {
        listing: { include: { merchant: true, safety: true } }, order: true,
      } });
      if (!reservation || reservation.customerId !== customerId) return { message: 'رزرو در دسترس نیست' };
      if (reservation.status !== ReservationStatus.PENDING || reservation.expiresAt <= new Date()) return { message: 'مهلت رزرو پایان یافته است' };
      if (reservation.listing.safety?.safetyStatus !== SafetyStatus.APPROVED || reservation.listing.merchant.verificationStatus !== 'APPROVED') return { message: 'بسته تاییدیه فعال ندارد' };
      if (reservation.order) return reservation.order.status === OrderStatus.PENDING_PAYMENT
        ? { order: reservation.order } : { message: 'سفارش قبلاً نهایی شده است' };
      const listing = reservation.listing;
      const total = listing.discountedPriceToman * BigInt(reservation.quantity);
      if (total <= BigInt(0) || total > BigInt(Number.MAX_SAFE_INTEGER)) return { message: 'مبلغ سفارش معتبر نیست' };
      const rate = Number(listing.merchant.commissionPercent ?? 10);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) return { message: 'کارمزد سفارش معتبر نیست' };
      const commission = (total * BigInt(Math.round(rate * 100)) + BigInt(5000)) / BigInt(10000);
      const order = await tx.order.create({ data: {
        orderNumber: `LQ-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
        customerId, merchantId: listing.merchantId ?? listing.merchant.id, reservationId, status: OrderStatus.PENDING_PAYMENT,
        totalAmountToman: total, commissionPercent: rate, commissionAmountToman: commission,
        merchantPayoutAmountToman: total - commission, notesFa,
        items: { create: { listingId: listing.id, unitPriceToman: listing.discountedPriceToman, quantity: reservation.quantity, subtotalToman: total } },
      }, include: { items: true } });
      return { order };
    });
    if (!prepared.order) return { success: false, message: prepared.message };
    const initiation = await paymentService.initiateOrderPayment({ order: prepared.order, gatewayType: gateway, callbackUrl, mobile });
    if (!initiation.success) return { success: false, message: initiation.errorMessage || 'درخواست پرداخت در حال بررسی است' };
    return { success: true, order: prepared.order, paymentUrl: initiation.paymentUrl, authority: initiation.authority };
  }

  /**
   * Verifies payment callback and completes order, inventory sale, and financial ledger
   */
  async verifyAndCompleteOrder(params: {
    authority: string;
    trackingCode?: string;
    ipAddress?: string;
  }): Promise<VerifyOrderPaymentResult> {
    const { authority, trackingCode, ipAddress } = params;

    // 1. Verify with payment gateway
    const verifyResult = await paymentService.verifyPayment({
      authority,
      trackingCode,
      ipAddress,
    });

    if (!verifyResult.success || !verifyResult.payment) {
      return {
        success: false,
        message: verifyResult.errorMessage || 'پرداخت تایید نشد یا توسط کاربر انصراف داده شد',
      };
    }

    const orderId = verifyResult.orderId;
    if (!orderId) return { success: false, message: 'سفارش مورد نظر یافت نشد' };
    let completedNow = false;
    let result: VerifyOrderPaymentResult;
    try {
      result = await prisma.$transaction(async (tx): Promise<VerifyOrderPaymentResult> => {
        // Serialize callbacks before reading state. All sale/ledger effects commit together.
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
        const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, reservation: true } });
        if (!order) return { success: false, message: 'سفارش مورد نظر یافت نشد' };
        const issue = async (reason: string) => {
          await tx.reconciliationCase.upsert({ where: { caseKey: `${verifyResult.payment.id}:${reason}` }, update: {}, create: {
            caseKey: `${verifyResult.payment.id}:${reason}`, merchantId: order.merchantId, orderId: order.id,
            paymentId: verifyResult.payment.id, reason,
          } });
        };
        await tx.$queryRaw`SELECT id FROM "Payment" WHERE id=${verifyResult.payment.id} FOR UPDATE`;
        const currentPayment = await tx.payment.findUnique({ where: { id: verifyResult.payment.id } });
        if (!currentPayment || currentPayment.status !== 'SUCCESS' || currentPayment.orderId !== order.id) {
          return { success: false, message: 'پرداخت قابل تخصیص نیست' };
        }
        if (await tx.refund.findFirst({ where: { paymentId: currentPayment.id, status: { not: 'REJECTED' } } })) {
          await issue('REFUND_PENDING');
          return { success: false, message: 'پرداخت در مسیر استرداد است' };
        }
        if (order.acceptedPaymentId && order.acceptedPaymentId !== currentPayment.id) {
          await issue('DUPLICATE_PAYMENT');
          return { success: false, message: 'پرداخت اضافه نیازمند بررسی است' };
        }

        if (BigInt(currentPayment.amountToman) !== order.totalAmountToman) {
          await issue('AMOUNT_MISMATCH');
          return { success: false, message: 'مغایرت مبلغ پرداختی با فاکتور سفارش. تراکنش نیازمند بررسی است.' };
        }
        if (([OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED] as OrderStatus[]).includes(order.status)) {
          if (!order.acceptedPaymentId) {
            await issue('LEGACY_ALLOCATION_UNKNOWN');
            return { success: false, message: 'تخصیص پرداخت قدیمی نیازمند بررسی است' };
          }
          return { success: true, order, referenceId: verifyResult.referenceId, orderNumber: order.orderNumber };
        }
        if (order.status !== OrderStatus.PENDING_PAYMENT || !order.reservationId) {
          await issue('ORDER_NOT_PAYABLE');
          return { success: false, message: 'وضعیت سفارش اجازه تکمیل پرداخت را نمی‌دهد؛ با پشتیبانی تماس بگیرید.' };
        }
        const now = new Date();
        const claimed = await tx.reservation.updateMany({
          where: { id: order.reservationId, status: ReservationStatus.PENDING, expiresAt: { gt: now } },
          data: { status: ReservationStatus.CONVERTED_TO_ORDER, updatedAt: now },
        });
        if (claimed.count !== 1) {
          await issue('RESERVATION_EXPIRED');
          return { success: false, message: 'رزرو منقضی یا آزاد شده است؛ پرداخت برای بررسی و استرداد نیازمند پیگیری پشتیبانی است.' };
        }
        for (const item of order.items) {
          const sold = await inventoryService.atomicConfirmSold(item.listingId, item.quantity, tx);
          if (!sold.success) throw new Error('Reserved inventory unavailable');
        }
        const updatedOrder = await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.READY_FOR_PICKUP, updatedAt: now, paidAt: now, acceptedPaymentId: currentPayment.id } });
        const transfers = [
          { type: FinancialTransactionType.CUSTOMER_PAYMENT, debitAccount: 'CUSTOMER_PAYMENT', creditAccount: 'PLATFORM_CLEARING', amountToman: order.totalAmountToman },
          { type: FinancialTransactionType.MERCHANT_PAYOUT, debitAccount: 'PLATFORM_CLEARING', creditAccount: 'MERCHANT_PAYABLE', amountToman: order.merchantPayoutAmountToman },
          { type: FinancialTransactionType.COMMISSION_EARNED, debitAccount: 'PLATFORM_CLEARING', creditAccount: 'PLATFORM_COMMISSION', amountToman: order.commissionAmountToman },
        ];
        for (const transfer of transfers) {
          await tx.financialTransaction.create({ data: { ...transfer, orderId: order.id, referenceNumber: verifyResult.referenceId, postingKey: `sale:${order.id}:${transfer.type}` } });
        }
        let savings = BigInt(0);
        for (const item of order.items) {
          if (item.originalPriceTomanSnapshot != null) {
            const difference = item.originalPriceTomanSnapshot - item.unitPriceToman;
            if (difference > BigInt(0)) savings += difference * BigInt(item.quantity);
          }
        }
        if (savings > BigInt(0)) await tx.customer.update({ where: { id: order.customerId }, data: { cumulativeSavingsToman: { increment: savings } } });
        completedNow = true;
        return { success: true, order: updatedOrder, referenceId: verifyResult.referenceId, orderNumber: order.orderNumber };
      });
    } catch {
      // Gateway verification remains recorded; a callback retry can safely resume completion.
      const order = await prisma.order.findUnique({ where: { id: orderId }, select: { merchantId: true } });
      if (order) await prisma.reconciliationCase.upsert({ where: { caseKey: `${verifyResult.payment.id}:COMPLETION_FAILED` }, update: {}, create: {
        caseKey: `${verifyResult.payment.id}:COMPLETION_FAILED`, merchantId: order.merchantId, orderId,
        paymentId: verifyResult.payment.id, reason: 'COMPLETION_FAILED',
      } });
      return { success: false, message: 'تکمیل سفارش انجام نشد؛ پرداخت ثبت شده است و نیازمند بررسی یا تلاش مجدد است.' };
    }
    if (completedNow) {
      try { await pickupService.getOrCreateVerification(orderId); }
      catch { console.warn('Failed to pre-initialize pickup verification'); }
    }
    return result;
  }
  /**
   * Retrieves all orders for a customer with merchant and listing relations
   */
  async listCustomerOrders(customerId: string) {
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        merchant: {
          include: { locations: true },
        },
        items: {
          include: { listing: true },
        },
        payments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        review: true,
        complaints: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      const firstItem = order.items[0];
      const primaryLoc = order.merchant.locations.find(l => l.id === order.merchantLocationId) ?? order.merchant.locations[0];

      const pickupStart = (firstItem?.pickupStartSnapshot ?? firstItem?.listing?.pickupStart);
      const pickupEnd = (firstItem?.pickupEndSnapshot ?? firstItem?.listing?.pickupEnd);

      let pickupWindowFa = '';
      if (pickupStart && pickupEnd) {
        const sHours = pickupStart.getHours().toString().padStart(2, '0');
        const sMins = pickupStart.getMinutes().toString().padStart(2, '0');
        const eHours = pickupEnd.getHours().toString().padStart(2, '0');
        const eMins = pickupEnd.getMinutes().toString().padStart(2, '0');
        pickupWindowFa = `${sHours}:${sMins} تا ${eHours}:${eMins}`;
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        merchantId: order.merchantId,
        merchantNameFa: order.merchant.businessNameFa,
        merchantAddressFa: order.pickupAddressFa ?? primaryLoc?.addressFa ?? '',
        listingTitleFa: firstItem?.titleFaSnapshot ?? firstItem?.listing?.titleFa ?? 'بسته لقمه',
        quantity: firstItem?.quantity || 1,
        totalAmountToman: Number(order.totalAmountToman),
        status: order.status,
        pickupWindowFa,
        pickupEndIso: pickupEnd ? pickupEnd.toISOString() : '',
        createdAt: order.createdAt.toISOString(),
        hasReview: Boolean(order.review),
        complaintCount: order.complaints.length,
      };
    });
  }

  /**
   * Retrieves single order by ID with full itemization and receipt details
   */
  async getOrderById(orderId: string, customerId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: {
          include: {
            locations: {
              include: { city: true, neighborhood: true },
            },
          },
        },
        items: {
          include: {
            listing: {
              include: { safety: true },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        reservation: true,
      },
    });

    if (!order) return null;
    if (customerId && order.customerId !== customerId) return null;

    const primaryLoc = order.merchant.locations.find(l => l.id === order.merchantLocationId) ?? order.merchant.locations[0];
    const latestPayment = order.payments[0];

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmountToman: Number(order.totalAmountToman),
      commissionAmountToman: Number(order.commissionAmountToman),
      merchantPayoutAmountToman: Number(order.merchantPayoutAmountToman),
      createdAt: order.createdAt.toISOString(),
      merchant: {
        id: order.merchant.id,
        businessNameFa: order.merchant.businessNameFa,
        addressFa: order.pickupAddressFa ?? primaryLoc?.addressFa,
        phone: primaryLoc?.phone,
        cityNameFa: primaryLoc?.city?.nameFa,
        neighborhoodNameFa: primaryLoc?.neighborhood?.nameFa,
      },
      items: order.items.map((i) => ({
        id: i.id,
        listingId: i.listingId,
        titleFa: i.titleFaSnapshot ?? i.listing.titleFa,
        unitPriceToman: Number(i.unitPriceToman),
        quantity: i.quantity,
        subtotalToman: Number(i.subtotalToman),
        pickupStart: (i.pickupStartSnapshot ?? i.listing.pickupStart).toISOString(),
        pickupEnd: (i.pickupEndSnapshot ?? i.listing.pickupEnd).toISOString(),
        safetyStatus: i.listing.safety?.safetyStatus,
      })),
      payment: latestPayment
        ? {
            gateway: latestPayment.gateway,
            authority: latestPayment.authority,
            referenceId: latestPayment.referenceId,
            trackingCode: latestPayment.trackingCode,
            status: latestPayment.status,
          }
        : null,
    };
  }
}

export const orderService = new OrderService();
