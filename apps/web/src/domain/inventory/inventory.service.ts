import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface InventoryStatus {
  totalQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  availableQuantity: number;
  isSoldOut: boolean;
}

export class InventoryService {
  /**
   * Retrieves stock status for a given listing
   */
  async getInventory(listingId: string): Promise<InventoryStatus | null> {
    const inv = await prisma.listingInventory.findUnique({
      where: { listingId },
    });

    if (!inv) return null;

    const availableQuantity = inv.totalQuantity - (inv.reservedQuantity + inv.soldQuantity);

    return {
      totalQuantity: inv.totalQuantity,
      reservedQuantity: inv.reservedQuantity,
      soldQuantity: inv.soldQuantity,
      availableQuantity: Math.max(0, availableQuantity),
      isSoldOut: availableQuantity <= 0,
    };
  }

  /**
   * Checks if sufficient quantity is available
   */
  async checkAvailability(listingId: string, requestedQuantity: number): Promise<boolean> {
    if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity <= 0) return false;
    const status = await this.getInventory(listingId);
    if (!status) return false;
    return status.availableQuantity >= requestedQuantity;
  }

  /**
   * Atomically reserves stock using database-level locking conditions to prevent overselling
   */
  async atomicReserve(listingId: string, quantity: number): Promise<{ success: boolean; message?: string }> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { success: false, message: 'تعداد درخواستی باید بزرگتر از صفر باشد' };
    }

    // Atomic update only succeeds if available stock is sufficient
    const count = await prisma.$executeRaw`
      UPDATE "ListingInventory"
      SET "reservedQuantity" = "reservedQuantity" + ${quantity},
          "version" = "version" + 1,
          "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      WHERE "listingId" = ${listingId}
        AND ("totalQuantity" - ("reservedQuantity" + "soldQuantity")) >= ${quantity}
        AND EXISTS (SELECT 1 FROM "Listing" l
          JOIN "ListingSafety" s ON s."listingId" = l.id
          JOIN "Merchant" m ON m.id = l."merchantId"
          WHERE l.id = ${listingId} AND l.status = 'PUBLISHED'
            AND l."pickupEnd" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AND s."safetyStatus" = 'APPROVED'
            AND m."verificationStatus" = 'APPROVED');
    `;

    if (count === 0) {
      return { success: false, message: 'موجودی این بسته به پایان رسیده است' };
    }

    return { success: true };
  }

  /**
   * Atomically releases an expired or cancelled reservation back into available inventory
   */
  async atomicRelease(listingId: string, quantity: number, tx?: Prisma.TransactionClient): Promise<{ success: boolean }> {
    if (!Number.isInteger(quantity) || quantity <= 0) return { success: false };
    const release = async (db: Prisma.TransactionClient) => {
      const count = await db.$executeRaw`
        UPDATE "ListingInventory"
        SET "reservedQuantity" = "reservedQuantity" - ${quantity},
            "version" = "version" + 1, "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
        WHERE "listingId" = ${listingId} AND "reservedQuantity" >= ${quantity};
      `;
      await this.reconcileStatus(db, listingId);
      return { success: count > 0 };
    };
    return tx ? release(tx) : prisma.$transaction(release);
  }

  private async reconcileStatus(tx: Prisma.TransactionClient, listingId: string) {
    // Holds do not mean sales. Never reopen an operational/safety pause.
    await tx.$executeRaw`
      UPDATE "Listing" l SET status = CASE
        WHEN i."soldQuantity" >= i."totalQuantity" THEN 'SOLD_OUT'::"ListingStatus"
        ELSE 'PUBLISHED'::"ListingStatus" END, "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      FROM "ListingInventory" i, "ListingSafety" s, "Merchant" m
      WHERE l.id = ${listingId} AND i."listingId" = l.id AND s."listingId" = l.id
        AND m.id = l."merchantId" AND m."verificationStatus" = 'APPROVED'
        AND l.status IN ('PUBLISHED', 'SOLD_OUT')
        AND l."pickupEnd" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AND s."safetyStatus" = 'APPROVED';
    `;
  }

  /** Convert only an actual held quantity, preserving concurrent inventory bounds. */
  async atomicConfirmSold(listingId: string, quantity: number, tx?: Prisma.TransactionClient): Promise<{ success: boolean }> {
    if (!Number.isInteger(quantity) || quantity <= 0) return { success: false };
    const confirm = async (db: Prisma.TransactionClient) => {
      const count = await db.$executeRaw`
        UPDATE "ListingInventory"
        SET "reservedQuantity" = "reservedQuantity" - ${quantity},
            "soldQuantity" = "soldQuantity" + ${quantity},
            "version" = "version" + 1, "updatedAt" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
        WHERE "listingId" = ${listingId} AND "reservedQuantity" >= ${quantity};
      `;
      await this.reconcileStatus(db, listingId);
      return { success: count > 0 };
    };
    return tx ? confirm(tx) : prisma.$transaction(confirm);
  }
}

export const inventoryService = new InventoryService();
