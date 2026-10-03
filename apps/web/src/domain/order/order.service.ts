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
   * Generates a unique, friendly human order number (e.g. "LQ-74821")
   */
  private generateOrderNumber(): string {
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    return `LQ-${randomCode}`;
  }

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
    const {
      customerId,
      reservationId,
      gateway = process.env.NODE_ENV === 'production' ? PaymentGatewayType.ZARINPAL : PaymentGatewayType.MOCK,
      notesFa,
      callbackUrl,
      mobile,
    } = params;

    const now = new Date();

    // 1. Fetch and validate reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        listing: {
          include: { merchant: true, safety: true },
        },
        order: true,
      },
    });

    if (!reservation) {
      return { success: false, message: 'رزرو مورد نظر یافت نشد' };
    }

    if (reservation.customerId !== customerId) {
      return { success: false, message: 'دسترسی به این رزرو امکان‌پذیر نیست' };
    }

    if (reservation.status !== ReservationStatus.PENDING || reservation.expiresAt <= now) {
      return { success: false, message: 'مهلت ۱۰ دقیقه‌ای این رزرو منقضی شده است. لطفاً مجدداً رزرو نمایید.' };
    }

    // Safety lockout check
    if (reservation.listing.safety?.safetyStatus !== SafetyStatus.APPROVED) {
      return { success: false, message: 'این بسته به علت بررسی سلامت و بهداشت در حال حاضر قابل سفارش نیست' };
    }

    // 2. Check if an order already exists for this reservation
    if (reservation.order) {
      if (reservation.order.status !== OrderStatus.PENDING_PAYMENT) {
        return { success: false, message: 'این سفارش قبلاً پرداخت و نهایی شده است' };
      }

      // Re-initiate payment for existing pending order
      const initResult = await paymentService.initiateOrderPayment({
        order: reservation.order,
        gatewayType: gateway,
        callbackUrl,
        mobile,
      });

      if (!initResult.success) {
        return { success: false, message: initResult.errorMessage || 'خطا در برقراری ارتباط با درگاه پرداخت' };
      }

      return {
        success: true,
        order: reservation.order,
        paymentUrl: initResult.paymentUrl,
        authority: initResult.authority,
      };
    }

    // 3. Authoritative server-side financial calculations
    const listing = reservation.listing;
    const merchant = listing.merchant;
    const unitPriceToman = Number(listing.discountedPriceToman);
    const totalAmountToman = unitPriceToman * reservation.quantity;

    const commissionPercent = Number(merchant.commissionPercent ?? 10.0);
    const commissionAmountToman = Math.round((totalAmountToman * commissionPercent) / 100);
    const merchantPayoutAmountToman = totalAmountToman - commissionAmountToman;

    const orderNumber = this.generateOrderNumber();

    // 4. Create Order and OrderItem records atomically
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        merchantId: merchant.id,
        reservationId: reservation.id,
        status: OrderStatus.PENDING_PAYMENT,
        totalAmountToman: BigInt(totalAmountToman),
        commissionPercent,
        commissionAmountToman: BigInt(commissionAmountToman),
        merchantPayoutAmountToman: BigInt(merchantPayoutAmountToman),
        notesFa,
        items: {
          create: {
            listingId: listing.id,
            unitPriceToman: BigInt(unitPriceToman),
            quantity: reservation.quantity,
            subtotalToman: BigInt(totalAmountToman),
          },
        },
      },
      include: { items: true },
    });

    // 5. Initiate gateway payment session
    const paymentResult = await paymentService.initiateOrderPayment({
      order,
      gatewayType: gateway,
      callbackUrl,
      mobile,
    });

    if (!paymentResult.success) {
      return {
        success: false,
        message: paymentResult.errorMessage || 'خطا در برقراری ارتباط با درگاه پرداخت',
      };
    }

    return {
      success: true,
      order,
      paymentUrl: paymentResult.paymentUrl,
      authority: paymentResult.authority,
    };
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
        if (BigInt(verifyResult.payment.amountToman) !== order.totalAmountToman) {
          return { success: false, message: 'مغایرت مبلغ پرداختی با فاکتور سفارش. تراکنش نیازمند بررسی است.' };
        }
        if (([OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED] as OrderStatus[]).includes(order.status)) {
          return { success: true, order, referenceId: verifyResult.referenceId, orderNumber: order.orderNumber };
        }
        if (order.status !== OrderStatus.PENDING_PAYMENT || !order.reservationId) {
          return { success: false, message: 'وضعیت سفارش اجازه تکمیل پرداخت را نمی‌دهد؛ با پشتیبانی تماس بگیرید.' };
        }
        const now = new Date();
        const claimed = await tx.reservation.updateMany({
          where: { id: order.reservationId, status: ReservationStatus.PENDING, expiresAt: { gt: now } },
          data: { status: ReservationStatus.CONVERTED_TO_ORDER, updatedAt: now },
        });
        if (claimed.count !== 1) {
          return { success: false, message: 'رزرو منقضی یا آزاد شده است؛ پرداخت برای بررسی و استرداد نیازمند پیگیری پشتیبانی است.' };
        }
        for (const item of order.items) {
          const sold = await inventoryService.atomicConfirmSold(item.listingId, item.quantity, tx);
          if (!sold.success) throw new Error('Reserved inventory unavailable');
        }
        const updatedOrder = await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.READY_FOR_PICKUP, updatedAt: now } });
        const transfers = [
          { type: FinancialTransactionType.CUSTOMER_PAYMENT, debitAccount: 'CUSTOMER_PAYMENT', creditAccount: 'PLATFORM_CLEARING', amountToman: order.totalAmountToman },
          { type: FinancialTransactionType.MERCHANT_PAYOUT, debitAccount: 'PLATFORM_CLEARING', creditAccount: 'MERCHANT_PAYABLE', amountToman: order.merchantPayoutAmountToman },
          { type: FinancialTransactionType.COMMISSION_EARNED, debitAccount: 'PLATFORM_CLEARING', creditAccount: 'PLATFORM_COMMISSION', amountToman: order.commissionAmountToman },
        ];
        for (const transfer of transfers) {
          await tx.financialTransaction.create({ data: { ...transfer, orderId: order.id, referenceNumber: verifyResult.referenceId } });
        }
        let savings = BigInt(0);
        for (const item of order.items) {
          const listing = await tx.listing.findUnique({ where: { id: item.listingId }, select: { originalPriceToman: true } });
          if (listing) {
            const difference = listing.originalPriceToman - item.unitPriceToman;
            if (difference > BigInt(0)) savings += difference * BigInt(item.quantity);
          }
        }
        if (savings > BigInt(0)) await tx.customer.update({ where: { id: order.customerId }, data: { cumulativeSavingsToman: { increment: savings } } });
        completedNow = true;
        return { success: true, order: updatedOrder, referenceId: verifyResult.referenceId, orderNumber: order.orderNumber };
      });
    } catch {
      // Gateway verification remains recorded; a callback retry can safely resume completion.
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
          include: { locations: { take: 1 } },
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
      const primaryLoc = order.merchant.locations[0];

      const pickupStart = firstItem?.listing?.pickupStart;
      const pickupEnd = firstItem?.listing?.pickupEnd;

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
        merchantAddressFa: primaryLoc?.addressFa || '',
        listingTitleFa: firstItem?.listing?.titleFa || 'بسته لقمه',
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

    const primaryLoc = order.merchant.locations[0];
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
        addressFa: primaryLoc?.addressFa,
        phone: primaryLoc?.phone,
        cityNameFa: primaryLoc?.city?.nameFa,
        neighborhoodNameFa: primaryLoc?.neighborhood?.nameFa,
      },
      items: order.items.map((i) => ({
        id: i.id,
        listingId: i.listingId,
        titleFa: i.listing.titleFa,
        unitPriceToman: Number(i.unitPriceToman),
        quantity: i.quantity,
        subtotalToman: Number(i.subtotalToman),
        pickupStart: i.listing.pickupStart.toISOString(),
        pickupEnd: i.listing.pickupEnd.toISOString(),
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
