import { prisma } from '@/lib/prisma';
import { ListingStatus } from '@prisma/client';

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
    const status = await this.getInventory(listingId);
    if (!status) return false;
    return status.availableQuantity >= requestedQuantity;
  }

  /**
   * Atomically reserves stock using database-level locking conditions to prevent overselling
   */
  async atomicReserve(listingId: string, quantity: number): Promise<{ success: boolean; message?: string }> {
    if (quantity <= 0) {
      return { success: false, message: 'تعداد درخواستی باید بزرگتر از صفر باشد' };
    }

    // Atomic update only succeeds if available stock is sufficient
    const count = await prisma.$executeRaw`
      UPDATE "ListingInventory"
      SET "reservedQuantity" = "reservedQuantity" + ${quantity},
          "version" = "version" + 1,
          "updatedAt" = NOW()
      WHERE "listingId" = ${listingId}
        AND ("totalQuantity" - ("reservedQuantity" + "soldQuantity")) >= ${quantity};
    `;

    if (count === 0) {
      return { success: false, message: 'موجودی این بسته به پایان رسیده است' };
    }

    return { success: true };
  }

  /**
   * Atomically releases an expired or cancelled reservation back into available inventory
   */
  async atomicRelease(listingId: string, quantity: number): Promise<{ success: boolean }> {
    if (quantity <= 0) return { success: true };

    await prisma.$executeRaw`
      UPDATE "ListingInventory"
      SET "reservedQuantity" = GREATEST("reservedQuantity" - ${quantity}, 0),
          "version" = "version" + 1,
          "updatedAt" = NOW()
      WHERE "listingId" = ${listingId};
    `;

    return { success: true };
  }

  /**
   * Atomically converts a reservation into a confirmed sale upon successful payment
   */
  async atomicConfirmSold(listingId: string, quantity: number): Promise<{ success: boolean }> {
    const count = await prisma.$executeRaw`
      UPDATE "ListingInventory"
      SET "reservedQuantity" = GREATEST("reservedQuantity" - ${quantity}, 0),
          "soldQuantity" = "soldQuantity" + ${quantity},
          "version" = "version" + 1,
          "updatedAt" = NOW()
      WHERE "listingId" = ${listingId};
    `;

    // Check if item is now sold out and update listing status
    const updated = await this.getInventory(listingId);
    if (updated && updated.isSoldOut) {
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: ListingStatus.SOLD_OUT },
      });
    }

    return { success: count > 0 };
  }
}

export const inventoryService = new InventoryService();
