import { reservationService } from "@/domain/reservation/reservation.service";
import { listingAvailability, publicListingWhere } from "@/domain/listing/availability";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ListingSearchQuerySchema } from "@loqme/validation";
import { ListingStatus, SafetyStatus } from "@prisma/client";
import { ListingSummaryDto } from "@loqme/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );
    const validated = ListingSearchQuerySchema.safeParse(searchParams);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: "پارامترهای جستجو نامعتبر است",
          errors: validated.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { q, cityId, categoryId, limit } = validated.data;
    await reservationService.sweepExpiredReservations();
    const now = new Date();

    const listings = await prisma.listing.findMany({
      where: {
        ...publicListingWhere(),
        safety: { safetyStatus: SafetyStatus.APPROVED },
        pickupEnd: { gt: now },
        categoryId: categoryId || undefined,
        location: cityId ? { cityId } : undefined,
        OR: [
          { titleFa: { contains: q, mode: "insensitive" } },
          { descriptionFa: { contains: q, mode: "insensitive" } },
          {
            merchant: { businessNameFa: { contains: q, mode: "insensitive" } },
          },
          { category: { nameFa: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        merchant: {
          include: {
            locations: { take: 1 },
          },
        },
        category: true,
        inventory: true,
        images: { orderBy: { isPrimary: "desc" }, take: 1 },
        safety: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const results: ListingSummaryDto[] = listings
      .map((listing) => {
        const primaryLoc = listing.merchant.locations[0];
        const originalPrice = Number(listing.originalPriceToman);
        const discountedPrice = Number(listing.discountedPriceToman);
        const discountPercent =
          originalPrice > 0
            ? Math.round(
                ((originalPrice - discountedPrice) / originalPrice) * 100,
              )
            : 0;
        const remainingQuantity = listing.inventory
          ? listing.inventory.totalQuantity -
            (listing.inventory.reservedQuantity +
              listing.inventory.soldQuantity)
          : 0;

        const startHours = listing.pickupStart
          .getHours()
          .toString()
          .padStart(2, "0");
        const startMins = listing.pickupStart
          .getMinutes()
          .toString()
          .padStart(2, "0");
        const endHours = listing.pickupEnd
          .getHours()
          .toString()
          .padStart(2, "0");
        const endMins = listing.pickupEnd
          .getMinutes()
          .toString()
          .padStart(2, "0");

        return {
          ...listingAvailability(listing),
          id: listing.id,
          imageUrl: listing.images[0]?.imageUrl || null,
          merchantId: listing.merchantId,
          storeNameFa: listing.merchant.businessNameFa,
          businessType: listing.merchant.businessType,
          categoryNameFa: listing.category.nameFa,
          categorySlug: listing.category.slug,
          titleFa: listing.titleFa,
          descriptionFa: listing.descriptionFa,
          originalPriceToman: originalPrice,
          discountedPriceToman: discountedPrice,
          discountPercent,

          pickupWindowFa: `${startHours}:${startMins} تا ${endHours}:${endMins}`,
          pickupEndIso: listing.pickupEnd.toISOString(),
          safetyVerified:
            listing.safety?.safetyStatus === SafetyStatus.APPROVED,
          latitude: primaryLoc?.latitude,
          longitude: primaryLoc?.longitude,
          addressFa: primaryLoc?.addressFa,
          type: listing.type,
        };
      });

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Error in listing search:", error);
    return NextResponse.json(
      { success: false, message: "خطا در جستجوی آگهی‌ها" },
      { status: 500 },
    );
  }
}
