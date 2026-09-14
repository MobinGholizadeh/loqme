/**
 * Pickup Verification Domain Service — Milestone M05
 * Governs the cryptographic dynamic QR token generation, 4-digit OTP fallback,
 * atomic verification handshake, double-pickup prevention, and no-show sweeps.
 */

import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { merchantService } from '@/domain/merchant/merchant.service';
import {
  OrderStatus,
  Role,
  StaffRole,
} from '@prisma/client';
import {
  CustomerPickupCredentialsDto,
  MerchantPickupQueueItemDto,
  VerifyPickupResponseDto,
  NoShowSweepResultDto,
} from '@loqme/types';
import { toEnglishDigits, toPersianDigits, formatToman } from '@/lib/utils/persian';

export class PickupService {
  private getSecretKey(): string {
    return process.env.SESSION_SECRET || 'loqme-development-session-super-secret-key-change-in-production-32c';
  }

  /**
   * Generates a dynamic HMAC-SHA256 signed QR code token for an order.
   * Auto-rotated every 60 seconds.
   */
  generateDynamicQrToken(orderId: string, timestamp?: number): string {
    const t = timestamp || Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(4).toString('hex');
    const payload = JSON.stringify({ orderId, t, nonce });
    const encodedPayload = Buffer.from(payload, 'utf8').toString('base64url');

    const hmac = crypto.createHmac('sha256', this.getSecretKey());
    hmac.update(encodedPayload);
    const signature = hmac.digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  /**
   * Verifies the cryptographic integrity and freshness of a dynamic QR token.
   * Allows a 180-second window to accommodate clock drift and transition latency,
   * defeating static screenshots.
   */
  verifyDynamicQrToken(token: string): { valid: boolean; orderId?: string; reason?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        return { valid: false, reason: 'ساختار توکن نامعتبر است' };
      }

      const [encodedPayload, signature] = parts;
      const hmac = crypto.createHmac('sha256', this.getSecretKey());
      hmac.update(encodedPayload);
      const expectedSignature = hmac.digest('base64url');

      const sigBuf = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');

      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return { valid: false, reason: 'امضای دیجیتال بارکد نامعتبر است' };
      }

      const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      if (!decoded.orderId || !decoded.t) {
        return { valid: false, reason: 'محتوای توکن ناقص است' };
      }

      const currentSec = Math.floor(Date.now() / 1000);
      const tokenSec = Number(decoded.t);
      const delta = currentSec - tokenSec;

      // Allow up to 180 seconds (3 minutes) validity
      if (delta > 180) {
        return { valid: false, reason: 'کد QR منقضی شده است. لطفاً صفحه را تازه‌سازی کنید.' };
      }

      // Rejection for future timestamps beyond 30s clock skew
      if (delta < -30) {
        return { valid: false, reason: 'زمان بارکد نامعتبر است' };
      }

      return { valid: true, orderId: decoded.orderId };
    } catch {
      return { valid: false, reason: 'خطا در پردازش توکن بارکد' };
    }
  }

  /**
   * Generates a 4-digit numeric CSPRNG code (1000 - 9999)
   */
  generateOtpCode(): string {
    return crypto.randomInt(1000, 10000).toString();
  }

  /**
   * Idempotently finds or initializes a PickupVerification record for an order
   */
  async getOrCreateVerification(orderId: string) {
    const existing = await prisma.pickupVerification.findUnique({
      where: { orderId },
    });

    if (existing) {
      return existing;
    }

    const otpCode = this.generateOtpCode();
    const qrCodeHash = crypto.createHash('sha256').update(orderId + otpCode).digest('hex');

    return prisma.pickupVerification.create({
      data: {
        orderId,
        otpCode,
        qrCodeHash,
        isVerified: false,
      },
    });
  }

  /**
   * Fetches customer pickup credentials with rotating dynamic QR code and 4-digit OTP
   */
  async getCustomerPickupCredentials(
    orderId: string,
    customerId?: string
  ): Promise<CustomerPickupCredentialsDto | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { include: { user: true } },
        merchant: {
          include: {
            locations: {
              take: 1,
              include: { city: true, neighborhood: true },
            },
          },
        },
        items: {
          include: { listing: true },
        },
        pickupVerification: true,
      },
    });

    if (!order) return null;
    if (customerId && order.customerId !== customerId) return null;

    // Ensure verification record exists
    let verification = order.pickupVerification;
    if (!verification) {
      verification = await this.getOrCreateVerification(order.id);
    }

    const firstItem = order.items[0];
    const listing = firstItem?.listing;
    const primaryLoc = order.merchant.locations[0];

    const pickupStart = listing?.pickupStart;
    const pickupEnd = listing?.pickupEnd;
    const now = new Date();
    const isPastPickupEnd = pickupEnd ? pickupEnd.getTime() < now.getTime() : false;

    let pickupWindowFa = 'امروز در ساعات کاری';
    if (pickupStart && pickupEnd) {
      const sH = pickupStart.getHours().toString().padStart(2, '0');
      const sM = pickupStart.getMinutes().toString().padStart(2, '0');
      const eH = pickupEnd.getHours().toString().padStart(2, '0');
      const eM = pickupEnd.getMinutes().toString().padStart(2, '0');
      pickupWindowFa = `${sH}:${sM} تا ${eH}:${eM}`;
    }

    // Dynamic QR token generation
    const qrToken = this.generateDynamicQrToken(order.id);

    // Remaining seconds in current 60s rotation cycle
    const currentSec = Math.floor(Date.now() / 1000);
    const expiresInSeconds = 60 - (currentSec % 60);

    // Generate high-resolution SVG or DataURL for fast client rendering
    let qrDataUrl = '';
    let qrSvg = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrToken, {
        margin: 2,
        width: 360,
        color: {
          dark: '#0F766E', // Deep Teal Brand Color
          light: '#FFFFFF',
        },
      });
      qrSvg = await QRCode.toString(qrToken, {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#0F766E',
          light: '#FFFFFF',
        },
      });
    } catch (qrErr) {
      console.error('Failed to generate QR graphics:', qrErr);
    }

    let directionsUrl = '';
    if (primaryLoc?.latitude && primaryLoc?.longitude) {
      directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${primaryLoc.latitude},${primaryLoc.longitude}`;
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      otpCode: verification.otpCode,
      otpCodePersian: toPersianDigits(verification.otpCode),
      qrToken,
      qrSvg,
      qrDataUrl,
      expiresInSeconds,
      isVerified: verification.isVerified,
      verifiedAt: verification.verifiedAt ? verification.verifiedAt.toISOString() : null,
      pickupWindowFa,
      pickupStartIso: pickupStart ? pickupStart.toISOString() : '',
      pickupEndIso: pickupEnd ? pickupEnd.toISOString() : '',
      isPastPickupEnd,
      listingTitleFa: listing?.titleFa || 'بسته لقمه',
      quantity: firstItem?.quantity || 1,
      totalAmountToman: Number(order.totalAmountToman),
      merchant: {
        id: order.merchant.id,
        businessNameFa: order.merchant.businessNameFa,
        addressFa: primaryLoc?.addressFa,
        phone: primaryLoc?.phone || undefined,
        latitude: primaryLoc?.latitude,
        longitude: primaryLoc?.longitude,
        directionsUrl,
      },
    };
  }

  /**
   * Merchant Verification Handshake (Camera QR Scan or Manual 4-Digit OTP)
   * Enforces staff authorization, rate-limiting lockout, and PostgreSQL atomic concurrency defense.
   */
  async verifyPickup(input: {
    merchantUserId: string;
    qrToken?: string;
    otpCode?: string;
    orderNumber?: string;
    orderId?: string;
  }): Promise<{
    statusCode: number;
    response: VerifyPickupResponseDto;
  }> {
    const { merchantUserId, qrToken } = input;
    const otpCode = input.otpCode ? toEnglishDigits(input.otpCode).trim() : undefined;
    const orderNumber = input.orderNumber ? toEnglishDigits(input.orderNumber).trim().toUpperCase() : undefined;

    // 1. Resolve target order ID
    let targetOrderId = input.orderId;

    if (qrToken) {
      const decoded = this.verifyDynamicQrToken(qrToken);
      if (!decoded.valid || !decoded.orderId) {
        return {
          statusCode: 400,
          response: {
            success: false,
            message: decoded.reason || 'بارکد اسکن‌شده نامعتبر یا منقضی است',
            orderId: '',
            orderNumber: '',
            status: OrderStatus.PENDING_PAYMENT,
            verifiedAt: '',
            customerNameFa: '',
            listingTitleFa: '',
            quantity: 0,
            totalAmountToman: 0,
          },
        };
      }
      targetOrderId = decoded.orderId;
    }

    // 2. Query target order with merchant, items, and verification records
    let order = targetOrderId
      ? await prisma.order.findUnique({
          where: { id: targetOrderId },
          include: {
            customer: { include: { user: true } },
            merchant: { include: { staff: true } },
            items: { include: { listing: true } },
            pickupVerification: true,
          },
        })
      : null;

    // If order not found by ID, try searching by orderNumber
    if (!order && orderNumber) {
      order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          customer: { include: { user: true } },
          merchant: { include: { staff: true } },
          items: { include: { listing: true } },
          pickupVerification: true,
        },
      });
      if (order) {
        targetOrderId = order.id;
      }
    }

    // If still not found and only OTP provided, look up by OTP for any merchant accessible to user
    if (!order && otpCode && !orderNumber) {
      const accessibleMerchants = await this.getUserAccessibleMerchantIds(merchantUserId);
      const candidateVerification = await prisma.pickupVerification.findFirst({
        where: {
          otpCode,
          isVerified: false,
          order: {
            merchantId: { in: accessibleMerchants },
            status: { in: [OrderStatus.READY_FOR_PICKUP, OrderStatus.PAID] },
          },
        },
        include: {
          order: {
            include: {
              customer: { include: { user: true } },
              merchant: { include: { staff: true } },
              items: { include: { listing: true } },
              pickupVerification: true,
            },
          },
        },
      });

      if (candidateVerification) {
        order = candidateVerification.order;
        targetOrderId = order.id;
      }
    }

    if (!order || !targetOrderId) {
      return {
        statusCode: 404,
        response: {
          success: false,
          message: 'سفارشی با این مشخصات یافت نشد',
          orderId: '',
          orderNumber: '',
          status: OrderStatus.PENDING_PAYMENT,
          verifiedAt: '',
          customerNameFa: '',
          listingTitleFa: '',
          quantity: 0,
          totalAmountToman: 0,
        },
      };
    }

    // Ensure verification record exists
    let verification = order.pickupVerification;
    if (!verification) {
      verification = await this.getOrCreateVerification(order.id);
    }

    // 3. Authorization Check: Staff or Owner of THIS specific merchant (or ADMIN)
    const actorUser = await prisma.user.findUnique({
      where: { id: merchantUserId },
      select: { role: true },
    });

    const isPlatformAdmin = actorUser?.role === Role.ADMIN;
    const isStoreOwner = order.merchant.ownerUserId === merchantUserId;
    const staffMember = order.merchant.staff.find(
      (s) => s.userId === merchantUserId && s.canScanPickup
    );

    if (!isPlatformAdmin && !isStoreOwner && !staffMember) {
      console.warn(
        `Security Alert: Unauthorized pickup attempt on order ${order.orderNumber} by user ${merchantUserId}`
      );
      return {
        statusCode: 403,
        response: {
          success: false,
          message: 'عدم دسترسی: این سفارش متعلق به فروشگاه شما نمی‌باشد',
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          verifiedAt: '',
          customerNameFa: '',
          listingTitleFa: '',
          quantity: 0,
          totalAmountToman: 0,
        },
      };
    }

    // 4. Rate Limiting Lockout Guard (Max 5 failed attempts -> 15 min lock)
    const now = new Date();
    if (verification.lockedUntil && verification.lockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (verification.lockedUntil.getTime() - now.getTime()) / (60 * 1000)
      );
      return {
        statusCode: 429,
        response: {
          success: false,
          message: `امکان تایید این سفارش به دلیل ۵ بار ورود اشتباه تا ${toPersianDigits(remainingMinutes)} دقیقه دیگر مسدود است`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          verifiedAt: '',
          customerNameFa: '',
          listingTitleFa: '',
          quantity: 0,
          totalAmountToman: 0,
        },
      };
    }

    // 5. Check if already completed or verified (DOUBLE-PICKUP PREVENTION)
    if (verification.isVerified || order.status === OrderStatus.COMPLETED) {
      const verifiedTimeFa = verification.verifiedAt
        ? new Date(verification.verifiedAt).toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'نامشخص';

      return {
        statusCode: 409,
        response: {
          success: false,
          alreadyVerified: true,
          message: `این سفارش قبلاً در ساعت ${verifiedTimeFa} تحویل داده شده است! تحویل مجدد مجاز نمی‌باشد.`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: OrderStatus.COMPLETED,
          verifiedAt: verification.verifiedAt?.toISOString() || now.toISOString(),
          customerNameFa: order.customer.fullName || 'مشتری لقمه',
          listingTitleFa: order.items[0]?.listing.titleFa || 'بسته لقمه',
          quantity: order.items[0]?.quantity || 1,
          totalAmountToman: Number(order.totalAmountToman),
        },
      };
    }

    // 6. If OTP was provided, validate matching code
    if (otpCode) {
      if (otpCode !== verification.otpCode) {
        const nextAttempts = verification.attemptCount + 1;
        const willLock = nextAttempts >= 5;
        const lockedUntil = willLock ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await prisma.pickupVerification.update({
          where: { id: verification.id },
          data: {
            attemptCount: nextAttempts,
            lockedUntil,
          },
        });

        const remainingAttempts = Math.max(0, 5 - nextAttempts);
        return {
          statusCode: 400,
          response: {
            success: false,
            message: willLock
              ? 'کد وارد شده اشتباه است. سفارش به مدت ۱۵ دقیقه مسدود شد.'
              : `کد ۴ رقمی تحویل نادرست است. (${toPersianDigits(remainingAttempts)} تلاش باقی‌مانده)`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            verifiedAt: '',
            customerNameFa: '',
            listingTitleFa: '',
            quantity: 0,
            totalAmountToman: 0,
          },
        };
      }
    }

    // 7. Atomic Concurrency Lock: UPDATE WHERE isVerified = false
    // If multiple concurrent requests hit this point at the exact same millisecond,
    // exactly one will update the row and receive count = 1. All others receive count = 0.
    const updateResult = await prisma.pickupVerification.updateMany({
      where: {
        id: verification.id,
        isVerified: false,
      },
      data: {
        isVerified: true,
        verifiedAt: now,
        verifiedByUserId: merchantUserId,
        verifiedByStaffId: staffMember?.id || null,
        attemptCount: 0,
        lockedUntil: null,
      },
    });

    if (updateResult.count === 0) {
      // Race condition caught: another concurrent request just completed the order!
      return {
        statusCode: 409,
        response: {
          success: false,
          alreadyVerified: true,
          message: 'این سفارش هم‌اکنون در درخواست موازی دیگری با موفقیت تحویل شد.',
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: OrderStatus.COMPLETED,
          verifiedAt: now.toISOString(),
          customerNameFa: order.customer.fullName || 'مشتری لقمه',
          listingTitleFa: order.items[0]?.listing.titleFa || 'بسته لقمه',
          quantity: order.items[0]?.quantity || 1,
          totalAmountToman: Number(order.totalAmountToman),
        },
      };
    }

    // 8. Transition Order status to COMPLETED
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.COMPLETED,
        updatedAt: now,
      },
    });

    const firstItem = order.items[0];

    return {
      statusCode: 200,
      response: {
        success: true,
        message: 'تحویل حضوری با موفقیت تایید و سفارش تکمیل گردید. نوش جان!',
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: OrderStatus.COMPLETED,
        verifiedAt: now.toISOString(),
        customerNameFa: order.customer.fullName || 'مشتری لقمه',
        listingTitleFa: firstItem?.listing.titleFa || 'بسته لقمه',
        quantity: firstItem?.quantity || 1,
        totalAmountToman: Number(order.totalAmountToman),
      },
    };
  }

  /**
   * Retrieves active pickup queue for a merchant staff/owner
   */
  async getMerchantPickupQueue(
    merchantUserId: string,
    merchantId?: string
  ): Promise<MerchantPickupQueueItemDto[]> {
    // 1. Resolve merchant ID
    const { merchant } = await merchantService.resolveMerchantAndAuthorize(merchantUserId, merchantId);
    const targetMerchantId = merchant.id;

    // Automatically trigger background sweep for elapsed orders
    await this.sweepNoShows().catch((err) => {
      console.warn('Silent no-show sweep error:', err);
    });

    // 2. Fetch orders in READY_FOR_PICKUP, PAID, or recently COMPLETED/NO_SHOW today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        merchantId: targetMerchantId,
        OR: [
          { status: { in: [OrderStatus.READY_FOR_PICKUP, OrderStatus.PAID] } },
          {
            status: { in: [OrderStatus.COMPLETED, OrderStatus.NO_SHOW] },
            updatedAt: { gte: startOfToday },
          },
        ],
      },
      include: {
        customer: { include: { user: true } },
        items: { include: { listing: true } },
        pickupVerification: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return orders.map((order) => {
      const firstItem = order.items[0];
      const listing = firstItem?.listing;
      const pickupStart = listing?.pickupStart;
      const pickupEnd = listing?.pickupEnd;
      const isPastPickupEnd = pickupEnd ? pickupEnd.getTime() < now.getTime() : false;

      let pickupWindowFa = 'امروز در ساعات کاری';
      if (pickupStart && pickupEnd) {
        const sH = pickupStart.getHours().toString().padStart(2, '0');
        const sM = pickupStart.getMinutes().toString().padStart(2, '0');
        const eH = pickupEnd.getHours().toString().padStart(2, '0');
        const eM = pickupEnd.getMinutes().toString().padStart(2, '0');
        pickupWindowFa = `${sH}:${sM} تا ${eH}:${eM}`;
      }

      // Mask customer phone e.g. 0912***4321
      const rawMobile = order.customer.user.mobile;
      const maskedMobile = rawMobile
        ? `${rawMobile.slice(0, 4)}***${rawMobile.slice(-4)}`
        : '';

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerNameFa: order.customer.fullName || 'مشتری لقمه',
        customerMobileMasked: toPersianDigits(maskedMobile),
        listingTitleFa: listing?.titleFa || 'بسته لقمه',
        quantity: firstItem?.quantity || 1,
        totalAmountToman: Number(order.totalAmountToman),
        pickupWindowFa,
        pickupStartIso: pickupStart ? pickupStart.toISOString() : '',
        pickupEndIso: pickupEnd ? pickupEnd.toISOString() : '',
        isPastPickupEnd,
        otpCode: order.pickupVerification?.otpCode || '',
        isVerified: order.pickupVerification?.isVerified || false,
        verifiedAt: order.pickupVerification?.verifiedAt
          ? order.pickupVerification.verifiedAt.toISOString()
          : null,
        createdAt: order.createdAt.toISOString(),
      };
    });
  }

  /**
   * Sweeps uncollected orders whose pickup window has closed without verification.
   * Transitions their status to NO_SHOW.
   */
  async sweepNoShows(): Promise<NoShowSweepResultDto> {
    const now = new Date();

    // Find orders where status is PAID / READY_FOR_PICKUP and pickupEnd < now
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP] },
        items: {
          some: {
            listing: {
              pickupEnd: { lt: now },
            },
          },
        },
        OR: [
          { pickupVerification: null },
          { pickupVerification: { isVerified: false } },
        ],
      },
      select: { id: true },
    });

    if (expiredOrders.length === 0) {
      return { success: true, sweptCount: 0, orderIds: [] };
    }

    const orderIds = expiredOrders.map((o) => o.id);

    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        status: OrderStatus.NO_SHOW,
        updatedAt: now,
      },
    });

    return {
      success: true,
      sweptCount: orderIds.length,
      orderIds,
    };
  }

  /**
   * Checks for orders that have not yet been picked up within 45 minutes of window closure
   */
  async checkPickupReminders(): Promise<number> {
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 45 * 60 * 1000); // within next 45 mins

    const candidateOrders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP] },
        items: {
          some: {
            listing: {
              pickupEnd: {
                gte: now,
                lte: reminderWindow,
              },
            },
          },
        },
        pickupVerification: {
          isVerified: false,
          reminderSentAt: null,
        },
      },
      include: {
        customer: { include: { user: true } },
        pickupVerification: true,
      },
    });

    for (const order of candidateOrders) {
      if (order.pickupVerification) {
        console.log(
          `📱 [PICKUP REMINDER - LOQME / لقمه] Sent reminder to ${order.customer.user.mobile} for Order ${order.orderNumber}`
        );
        await prisma.pickupVerification.update({
          where: { id: order.pickupVerification.id },
          data: { reminderSentAt: now },
        });
      }
    }

    return candidateOrders.length;
  }

  /**
   * Helper: Get all merchant IDs accessible to a given user
   */
  private async getUserAccessibleMerchantIds(userId: string): Promise<string[]> {
    const ownedStores = await prisma.merchant.findMany({
      where: { ownerUserId: userId },
      select: { id: true },
    });

    const staffRoles = await prisma.merchantStaff.findMany({
      where: { userId, canScanPickup: true },
      select: { merchantId: true },
    });

    const ids = new Set<string>();
    ownedStores.forEach((s) => ids.add(s.id));
    staffRoles.forEach((s) => ids.add(s.merchantId));

    return Array.from(ids);
  }

  /**
   * Helper: Get primary merchant ID for user
   */
  private async getPrimaryMerchantIdForUser(userId: string): Promise<string | null> {
    const owned = await prisma.merchant.findFirst({
      where: { ownerUserId: userId },
      select: { id: true },
    });
    if (owned) return owned.id;

    const staff = await prisma.merchantStaff.findFirst({
      where: { userId, canScanPickup: true },
      select: { merchantId: true },
    });
    return staff ? staff.merchantId : null;
  }
}

export const pickupService = new PickupService();
