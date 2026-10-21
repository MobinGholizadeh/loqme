import { withDatabaseService, withReservationWrite } from '@/lib/db/context';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/domain/inventory/inventory.service';
import { ReservationStatus, ListingStatus, SafetyStatus } from '@prisma/client';

export const RESERVATION_HOLD_MINUTES = 10;

export interface CreateReservationResult {
  success: boolean;
  message?: string;
  reservation?: {
    id: string;
    listingId: string;
    quantity: number;
    expiresAt: Date;
    remainingSeconds: number;
  };
}

export class ReservationService {
  /**
   * Creates a 10-minute temporary inventory lock for a customer.
   * Atomically decrements available inventory to guarantee anti-overselling.
   */
  async createReservation(params: {
    customerId: string;
    listingId: string;
    quantity?: number;
  }): Promise<CreateReservationResult> {
    return withReservationWrite(params.listingId, async () => {
    const { customerId, listingId, quantity = 1 } = params;

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 5) {
      return { success: false, message: 'تعداد بسته انتخابی باید بین ۱ تا ۵ عدد باشد' };
    }

    await this.sweepExpiredReservations(listingId);
    const now = new Date();

    // 1. Verify listing is published, food safety approved, and pickup window not expired
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { safety: true },
    });

    if (!listing) {
      return { success: false, message: 'بسته مورد نظر یافت نشد' };
    }

    if (listing.status !== ListingStatus.PUBLISHED) {
      return { success: false, message: 'این بسته در حال حاضر فعال نمی‌باشد' };
    }

    if (listing.safety?.safetyStatus !== SafetyStatus.APPROVED) {
      return { success: false, message: 'این بسته تاییدیه سلامت فعال ندارد' };
    }

    if (listing.pickupEnd <= now) {
      return { success: false, message: 'زمان تحویل حضوری این بسته سپری شده است' };
    }

    try {
      return await prisma.$transaction(async tx => {
        // Serialize same-customer retries across processes. The lock is released on rollback.
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${customerId + ':' + listingId}, 0))`;
        const existing = await tx.reservation.findFirst({ where: {
          customerId, listingId, status: ReservationStatus.PENDING, expiresAt: { gt: new Date() },
        } });
        if (existing) {
          if (existing.quantity !== quantity) return { success: false, message: 'برای تغییر تعداد، ابتدا رزرو قبلی را لغو کنید' };
          return { success: true, reservation: { id: existing.id, listingId, quantity: existing.quantity,
            expiresAt: existing.expiresAt, remainingSeconds: Math.max(0, Math.floor((existing.expiresAt.getTime() - Date.now()) / 1000)) } };
        }
        const reserved = await inventoryService.atomicReserve(listingId, quantity, tx);
        if (!reserved.success) return { success: false, message: reserved.message || 'موجودی کافی نیست' };
        const expiresAt = new Date(Date.now() + RESERVATION_HOLD_MINUTES * 60 * 1000);
        const reservation = await tx.reservation.create({ data: { customerId, listingId, quantity, expiresAt, status: ReservationStatus.PENDING } });
        return { success: true, reservation: { id: reservation.id, listingId, quantity, expiresAt,
          remainingSeconds: RESERVATION_HOLD_MINUTES * 60 } };
      });
    } catch {
      // The counter, its history and the hold all roll back together.
      return { success: false, message: 'خطا در ثبت رزرو بسته' };
    }
  
    });
  }

  /**
   * Retrieves reservation with active expiry check.
   * If expired, auto-releases hold back to inventory.
   */
  async getReservation(id: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            merchant: {
              include: { locations: { take: 1 } },
            },
          },
        },
        order: true,
      },
    });

    if (!reservation) return null;

    const now = new Date();

    // Check if pending reservation has expired
    if (reservation.status === ReservationStatus.PENDING && reservation.expiresAt <= now) {
      await this.releasePending(reservation.id, ReservationStatus.EXPIRED);
      reservation.status = ReservationStatus.EXPIRED;
    }

    const remainingSeconds =
      reservation.status === ReservationStatus.PENDING
        ? Math.max(0, Math.floor((reservation.expiresAt.getTime() - now.getTime()) / 1000))
        : 0;

    return {
      ...reservation,
      remainingSeconds,
      isExpired: reservation.status === ReservationStatus.EXPIRED || reservation.expiresAt <= now,
    };
  }

  /**
   * Sweeps and auto-releases all expired pending reservations.
   * Called by periodic cron or on-demand before checkout queries.
   */
  async sweepExpiredReservations(listingId?: string): Promise<number> {
    return withDatabaseService('expiry', listingId ?? '', async () => {
    const now = new Date();

    const expiredList = await prisma.reservation.findMany({
      where: {
        listingId,
        status: ReservationStatus.PENDING,
        expiresAt: { lte: now },
      },
      take: 50,
    });

    let released = 0;
    for (const res of expiredList) {
      if (await this.releasePending(res.id, ReservationStatus.EXPIRED)) released++;
    }
    return released;
  
    });
  }

  private async releasePending(id: string, status: 'EXPIRED' | 'RELEASED') {
    return withReservationWrite(id, async () => {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) return false;
      const claimed = await tx.reservation.updateMany({
        where: { id, status: ReservationStatus.PENDING,
          ...(status === 'EXPIRED' ? { expiresAt: { lte: new Date() } } : {}) },
        data: { status },
      });
      if (!claimed.count) return false;
      const result = await inventoryService.atomicRelease(reservation.listingId, reservation.quantity, tx);
      if (!result.success) throw new Error('موجودی رزرو با سفارش مطابقت ندارد');
      return true;
    });
  
    });
  }

  /**
   * Explicit cancellation by customer.
   */
  async cancelReservation(id: string, customerId: string): Promise<{ success: boolean; message: string }> {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation || reservation.customerId !== customerId) {
      return { success: false, message: 'رزرو مورد نظر یافت نشد' };
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      return { success: false, message: 'این رزرو قابل لغو نمی‌باشد' };
    }

    const released = await this.releasePending(id, ReservationStatus.RELEASED);
    if (!released) return { success: false, message: 'این رزرو قابل لغو نمی‌باشد' };

    return { success: true, message: 'رزرو با موفقیت لغو شد' };
  }
}

export const reservationService = new ReservationService();
