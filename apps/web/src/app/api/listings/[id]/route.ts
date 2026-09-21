import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        merchant: {
          include: {
            locations: {
              include: {
                city: true,
                neighborhood: true,
                hours: true,
              },
            },
          },
        },
        category: true,
        inventory: true,
        safety: true,
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { success: false, message: 'آگهی مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Check if customer has favorited this merchant
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
                merchantId: listing.merchantId,
              },
            },
          });
          isFavorited = !!fav;
        }
      }
    }

    const originalPrice = Number(listing.originalPriceToman);
    const discountedPrice = Number(listing.discountedPriceToman);
    const discountPercent = originalPrice > 0
      ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
      : 0;

    const availableQuantity = listing.inventory
      ? listing.inventory.totalQuantity - (listing.inventory.reservedQuantity + listing.inventory.soldQuantity)
      : 0;

    const primaryLocation = listing.merchant.locations[0];

    return NextResponse.json({
      success: true,
      data: {
        id: listing.id,
        merchantId: listing.merchantId,
        titleFa: listing.titleFa,
        descriptionFa: listing.descriptionFa,
        type: listing.type,
        status: listing.status,
        originalPriceToman: originalPrice,
        discountedPriceToman: discountedPrice,
        savingsToman: originalPrice - discountedPrice,
        discountPercent,
        pickupStart: listing.pickupStart.toISOString(),
        pickupEnd: listing.pickupEnd.toISOString(),
        isExpired: listing.pickupEnd < new Date(),
        isSoldOut: availableQuantity <= 0,
        inventory: {
          totalQuantity: listing.inventory?.totalQuantity ?? 0,
          availableQuantity: Math.max(0, availableQuantity),
        },
        safety: {
          safetyStatus: listing.safety?.safetyStatus ?? 'APPROVED',
          allergens: listing.safety?.allergens ?? [],
          dietaryTags: listing.safety?.dietaryTags ?? [],
          storageInstructionsFa: listing.safety?.storageInstructionsFa,
          temperatureRequirement: listing.safety?.temperatureRequirement ?? 'ROOM_TEMP',
        },
        category: {
          id: listing.category.id,
          nameFa: listing.category.nameFa,
          slug: listing.category.slug,
          iconUrl: listing.category.iconUrl,
        },
        merchant: {
          id: listing.merchant.id,
          businessNameFa: listing.merchant.businessNameFa,
          businessType: listing.merchant.businessType,
          ratingAverage: listing.merchant.ratingAverage,
          ratingCount: listing.merchant.ratingCount,
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
        },
        images: listing.images,
      },
    });
  } catch (error) {
    console.error('Error fetching listing details:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت جزئیات آگهی' },
      { status: 500 }
    );
  }
}
