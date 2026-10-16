import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { listingImageStorage } from './image-storage';
import { setHistoryActor } from '@/domain/merchant/history-context';

export async function updateListingImage(merchantId: string, listingId: string, input: unknown, actorId?: string) {
  const imageUrl = z.string().trim().min(1, 'تصویر بسته الزامی است').max(500).parse(input);
  await listingImageStorage.authorize(merchantId, imageUrl);
  return prisma.$transaction(async tx => {
    await setHistoryActor(tx, actorId, 'LISTING_IMAGE');
    const rows = await tx.$queryRaw<{ merchantId: string }[]>`SELECT "merchantId" FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
    if (rows[0]?.merchantId !== merchantId) throw new Error('عدم دسترسی: بسته متعلق به فروشگاه شما نیست');
    await tx.listingImage.updateMany({ where: { listingId, isPrimary: true }, data: { isPrimary: false } });
    const existing = await tx.listingImage.findFirst({ where: { listingId, imageUrl } });
    if (existing) await tx.listingImage.update({ where: { id: existing.id }, data: { isPrimary: true, displayOrder: 0 } });
    else await tx.listingImage.create({ data: { listingId, imageUrl, isPrimary: true, displayOrder: 0 } });
    return imageUrl;
  });
}
