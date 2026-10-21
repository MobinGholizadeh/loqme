import { withDatabaseRequest } from '@/lib/db/request';
import { reservationService } from "@/domain/reservation/reservation.service";
import { listingAvailability, publicListingWhere } from "@/domain/listing/availability";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { merchantService } from "@/domain/merchant/merchant.service";
import { MarketplaceFilterSchema } from "@loqme/validation";
import { ListingStatus, SafetyStatus } from "@prisma/client";
import { ListingSummaryDto } from "@loqme/types";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );
    const validated = MarketplaceFilterSchema.safeParse(searchParams);

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

    const {
      latitude = 37.5342, // Default: Urmia Daneshkadeh
      longitude = 45.0681,
      radiusMeters = 10000,
      categoryId,
      businessType,
      limit = 30,
      scope,
      offset,
      q,
      categorySlug,
      maxPriceToman,
      neighborhoodSlug,
    } = validated.data;

    // 1. Find nearby merchant locations using PostGIS
    const nearbyLocations =
      scope === "all"
        ? []
        : await merchantService.findNearby({
            latitude,
            longitude,
            radiusMeters,
            businessType,
            limit: 50,
          });

    if (scope !== "all" && nearbyLocations.length === 0) {
      return NextResponse.json({ success: true, count: 0, data: [] });
    }

    const merchantIds = nearbyLocations.map((l) => l.merchantId);
    const distanceByMerchantId = new Map<
      string,
      { distanceMeters: number; addressFa: string; lat: number; lng: number }
    >();
    for (const loc of nearbyLocations) {
      if (!distanceByMerchantId.has(loc.merchantId)) {
        distanceByMerchantId.set(loc.merchantId, {
          distanceMeters: loc.distanceMeters,
          addressFa: loc.addressFa,
          lat: loc.latitude,
          lng: loc.longitude,
        });
      }
    }

    await reservationService.sweepExpiredReservations();
    const now = new Date();

    // 2. Fetch active listings for nearby merchants
    const listings = await prisma.listing.findMany({
      where: {
        ...publicListingWhere(),
        merchantId: scope === "all" ? undefined : { in: merchantIds },
        merchant: { verificationStatus: "APPROVED", businessType },
        categoryId: categoryId || undefined,
        category: categorySlug ? { slug: categorySlug } : undefined,
        location: neighborhoodSlug
          ? { neighborhood: { slug: neighborhoodSlug } }
          : undefined,
        discountedPriceToman: maxPriceToman
          ? { lte: BigInt(Math.floor(maxPriceToman)) }
          : undefined,
        OR: q
          ? [
              { titleFa: { contains: q, mode: "insensitive" } },
              { descriptionFa: { contains: q, mode: "insensitive" } },
              {
                merchant: {
                  businessNameFa: { contains: q, mode: "insensitive" },
                },
              },
            ]
          : undefined,
        safety: {
          safetyStatus: SafetyStatus.APPROVED,
        },
        pickupEnd: {
          gt: now,
        },
      },
      include: {
        merchant: {
          include: {
            locations: {
              take: 1,
              orderBy: { createdAt: "asc" },
              include: { city: true, neighborhood: true },
            },
          },
        },
        location: { include: { city: true, neighborhood: true } },
        category: true,
        inventory: true,
        images: { orderBy: { isPrimary: "desc" }, take: 1 },
        safety: true,
      },
      take: limit + 1,
      skip: offset,
      orderBy: [{ pickupEnd: "asc" }, { id: "asc" }],
    });

    // 3. Transform and format
    const results: ListingSummaryDto[] = listings
      .slice(0, limit)
      .map((listing) => {
        const locInfo = distanceByMerchantId.get(listing.merchantId);
        const location = listing.location || listing.merchant.locations[0];
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
          cityNameFa: location?.city.nameFa,
          neighborhoodNameFa: location?.neighborhood?.nameFa,
          neighborhoodSlug: location?.neighborhood?.slug,
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
          distanceMeters: locInfo?.distanceMeters,
          safetyVerified:
            listing.safety?.safetyStatus === SafetyStatus.APPROVED,
          latitude: location?.latitude ?? locInfo?.lat,
          longitude: location?.longitude ?? locInfo?.lng,
          addressFa: location?.addressFa ?? locInfo?.addressFa,
          type: listing.type,
        };
      })
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

    return NextResponse.json({
      success: true,
      count: results.length,
      nextOffset: listings.length > limit ? offset + limit : null,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching nearby listings:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت لیست آگهی‌های نزدیک" },
      { status: 500 },
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
