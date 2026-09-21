import type { ListingAvailability } from '@loqme/types';

/** Visibility and reservation eligibility are independent of remaining stock. */
export function publicListingWhere(now = new Date()) {
  return {
    status: { in: ['PUBLISHED', 'SOLD_OUT'] as ('PUBLISHED' | 'SOLD_OUT')[] },
    merchant: { verificationStatus: 'APPROVED' as const },
    safety: { safetyStatus: 'APPROVED' as const },
    pickupEnd: { gt: now },
    inventory: { isNot: null },
  };
}

export function listingAvailability(listing: {
  status: string;
  pickupEnd: Date;
  safety: { safetyStatus: string } | null;
  merchant?: { verificationStatus: string };
  inventory: { totalQuantity: number; reservedQuantity: number; soldQuantity: number } | null;
}, now = new Date()): { availability: ListingAvailability; remainingQuantity: number; canReserve: boolean } {
  const inventory = listing.inventory;
  const remainingQuantity = inventory
    ? Math.max(0, inventory.totalQuantity - inventory.reservedQuantity - inventory.soldQuantity) : 0;
  let availability: ListingAvailability;
  if (listing.pickupEnd <= now) availability = 'EXPIRED';
  else if (!inventory || !['PUBLISHED', 'SOLD_OUT'].includes(listing.status) ||
    listing.safety?.safetyStatus !== 'APPROVED' ||
    (listing.merchant && listing.merchant.verificationStatus !== 'APPROVED')) availability = 'UNAVAILABLE';
  else if (inventory.soldQuantity >= inventory.totalQuantity) availability = 'SOLD_OUT';
  else if (remainingQuantity === 0) availability = 'RESERVED';
  else availability = listing.status === 'PUBLISHED' ? 'AVAILABLE' : 'UNAVAILABLE';
  return { availability, remainingQuantity, canReserve: availability === 'AVAILABLE' };
}
