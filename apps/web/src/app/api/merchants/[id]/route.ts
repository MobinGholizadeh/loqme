import { reservationService } from "@/domain/reservation/reservation.service";
import { moderationService } from "@/domain/moderation/moderation.service";
import { listingAvailability, publicListingWhere } from "@/domain/listing/availability";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractSessionToken, verifySessionToken } from "@/lib/auth/session";
import { ListingStatus, SafetyStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await reservationService.sweepExpiredReservations();
    const { id } = await params;

    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            city: true,
            neighborhood: true,
            hours: {
              orderBy: { dayOfWeek: "asc" },
            },
          },
        },
        listings: {
          where: {
            ...publicListingWhere(),
            safety: { safetyStatus: SafetyStatus.APPROVED },
            pickupEnd: { gt: new Date() },
          },
          include: {
            category: true,
            images: { orderBy: { isPrimary: "desc" }, take: 1 },
            inventory: true,
            safety: true,
          },
          orderBy: { pickupEnd: "asc" },
        },
      },
    });

    if (!merchant || merchant.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { success: false, message: "فروشگاه مورد نظر یافت نشد" },
        { status: 404 },
      );
    }

    let isFavorited = false;
    const token = extractSessionToken(request);
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload) {
        const customer = await prisma.customer.findUnique({
          where: { userId: payload.userId },
        });
        if (customer) {
          const fav = await prisma.favorite.findUnique({
            where: {
              customerId_merchantId: {
                customerId: customer.id,
                merchantId: merchant.id,
              },
            },
          });
          isFavorited = !!fav;
        }
      }
    }

    const primaryLocation = merchant.locations[0];
    const ratings = await moderationService.getMerchantRatings(merchant.id);

    const activeListings = merchant.listings
      .map((listing) => {
        const originalPrice = Number(listing.originalPriceToman);
        const discountedPrice = Number(listing.discountedPriceToman);
        const discountPercent =
          originalPrice > 0
            ? Math.round(
                ((originalPrice - discountedPrice) / originalPrice) * 100,
              )
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
          safetyVerified:
            listing.safety?.safetyStatus === SafetyStatus.APPROVED,
          titleFa: listing.titleFa,
          type: listing.type,
          originalPriceToman: originalPrice,
          discountedPriceToman: discountedPrice,
          discountPercent,
          pickupWindowFa: `${startHours}:${startMins} تا ${endHours}:${endMins}`,
          pickupEndIso: listing.pickupEnd.toISOString(),
          categoryNameFa: listing.category.nameFa,
          categorySlug: listing.category.slug,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        id: merchant.id,
        businessNameFa: merchant.businessNameFa,
        businessType: merchant.businessType,
        ratingAverage: ratings.overallRating.average ?? 0,
        ratings,
        ratingCount: ratings.overallRating.count,
        verificationStatus: merchant.verificationStatus,
        isFavorited,
        location: primaryLocation
          ? {
              id: primaryLocation.id,
              addressFa: primaryLocation.addressFa,
              latitude: primaryLocation.latitude,
              longitude: primaryLocation.longitude,
              phone: primaryLocation.phone,
              cityNameFa: primaryLocation.city?.nameFa,
              neighborhoodNameFa: primaryLocation.neighborhood?.nameFa,
              hours: primaryLocation.hours,
            }
          : null,
        activeListings,
      },
    });
  } catch (error) {
    console.error("Error fetching merchant details:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت اطلاعات فروشگاه" },
      { status: 500 },
    );
  }
}
