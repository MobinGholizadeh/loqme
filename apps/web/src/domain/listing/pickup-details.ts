import { PickupDetailsSchema } from '@loqme/validation';
import { prisma } from '@/lib/prisma';
import { setHistoryActor } from '@/domain/merchant/history-context';

export const PICKUP_DETAILS_KEY = 'pickupDetails';
export function readPickupDetails(attributes: { key: string; valueJson: unknown }[]) {
  const parsed = PickupDetailsSchema.safeParse(attributes.find(item => item.key === PICKUP_DETAILS_KEY)?.valueJson);
  return parsed.success ? parsed.data : { containerProvided: null, carrierBagProvided: null, instructionsFa: '' };
}

export async function updatePickupDetails(merchantId: string, listingId: string, input: unknown, actorId?: string) {
  const details = PickupDetailsSchema.parse(input);
  return prisma.$transaction(async tx => {
    await setHistoryActor(tx, actorId, 'PICKUP_DETAILS');
    // Serialize edits on the listing: the legacy attributes table has no unique key constraint.
    const rows = await tx.$queryRaw<{ merchantId: string }[]>`SELECT "merchantId" FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
    if (rows[0]?.merchantId !== merchantId) throw new Error('عدم دسترسی: بسته متعلق به فروشگاه شما نیست');
    await tx.listingAttributes.deleteMany({ where: { listingId, key: PICKUP_DETAILS_KEY } });
    await tx.listingAttributes.create({ data: { listingId, key: PICKUP_DETAILS_KEY, valueJson: details } });
    return details;
  });
}
