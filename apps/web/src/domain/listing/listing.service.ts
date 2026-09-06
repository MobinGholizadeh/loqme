import { prisma } from '@/lib/prisma';
import {
  ListingType,
  ListingStatus,
  SafetyStatus,
  TemperatureRequirement,
} from '@prisma/client';
import {
  CreateListingInput,
  CreateListingSchema,
  CreateSurpriseBagInput,
  CreateSurpriseBagSchema,
} from '@loqme/validation';

export class ListingService {
  /**
   * Creates a Surprise Bag listing atomically with its inventory counter and safety metadata
   */
  async createSurpriseBag(
    merchantId: string,
    params: CreateSurpriseBagInput & {
      merchantLocationId?: string;
      pickupDate: Date | string;
      pickupStart: Date | string;
      pickupEnd: Date | string;
    }
  ) {
    const validated = CreateSurpriseBagSchema.parse(params);

    const pickupStartDate = new Date(params.pickupStart);
    const pickupEndDate = new Date(params.pickupEnd);
    const pickupDateObj = new Date(params.pickupDate);

    if (pickupEndDate.getTime() <= pickupStartDate.getTime()) {
      throw new Error('زمان پایان تحویل باید بعد از زمان شروع تحویل باشد');
    }

    if (validated.discountedPrice >= validated.originalPrice) {
      throw new Error('قیمت با تخفیف باید کمتر از قیمت اصلی باشد');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Listing
      const listing = await tx.listing.create({
        data: {
          merchantId,
          merchantLocationId: params.merchantLocationId,
          categoryId: validated.categoryId,
          type: ListingType.SURPRISE_BAG,
          titleFa: validated.title,
          descriptionFa: validated.description,
          originalPriceToman: BigInt(validated.originalPrice),
          discountedPriceToman: BigInt(validated.discountedPrice),
          pickupDate: pickupDateObj,
          pickupStart: pickupStartDate,
          pickupEnd: pickupEndDate,
          status: ListingStatus.PUBLISHED,
        },
      });

      // 2. Initialize ListingInventory
      const inventory = await tx.listingInventory.create({
        data: {
          listingId: listing.id,
          totalQuantity: validated.quantity,
          reservedQuantity: 0,
          soldQuantity: 0,
          version: 1,
        },
      });

      // 3. Initialize ListingSafety
      const safety = await tx.listingSafety.create({
        data: {
          listingId: listing.id,
          safetyStatus: SafetyStatus.APPROVED,
          allergens: validated.allergens ?? [],
          dietaryTags: validated.dietaryTags ?? [],
          storageInstructionsFa: validated.storageInstructionsFa,
          temperatureRequirement: (validated.temperatureRequirement as TemperatureRequirement) ?? TemperatureRequirement.ROOM_TEMP,
        },
      });

      return {
        ...listing,
        inventory,
        safety,
      };
    });
  }

  /**
   * Generic listing creation supporting both Surprise Bags and Flash Deals
   */
  async createListing(input: CreateListingInput) {
    const validated = CreateListingSchema.parse(input);

    const pickupStartDate = new Date(validated.pickupStart);
    const pickupEndDate = new Date(validated.pickupEnd);
    const pickupDateObj = new Date(validated.pickupDate);

    return await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          merchantId: validated.merchantId,
          merchantLocationId: validated.merchantLocationId,
          categoryId: validated.categoryId,
          type: validated.type as ListingType,
          titleFa: validated.titleFa,
          descriptionFa: validated.descriptionFa,
          originalPriceToman: BigInt(validated.originalPriceToman),
          discountedPriceToman: BigInt(validated.discountedPriceToman),
          pickupDate: pickupDateObj,
          pickupStart: pickupStartDate,
          pickupEnd: pickupEndDate,
          status: ListingStatus.PUBLISHED,
        },
      });

      const inventory = await tx.listingInventory.create({
        data: {
          listingId: listing.id,
          totalQuantity: validated.quantity,
          reservedQuantity: 0,
          soldQuantity: 0,
          version: 1,
        },
      });

      const safety = await tx.listingSafety.create({
        data: {
          listingId: listing.id,
          safetyStatus: SafetyStatus.APPROVED,
          allergens: validated.allergens,
          dietaryTags: validated.dietaryTags,
          storageInstructionsFa: validated.storageInstructionsFa,
          temperatureRequirement: validated.temperatureRequirement as TemperatureRequirement,
        },
      });

      return {
        ...listing,
        inventory,
        safety,
      };
    });
  }

  /**
   * Retrieves single listing with full relational details
   */
  async getListingById(id: string) {
    return await prisma.listing.findUnique({
      where: { id },
      include: {
        merchant: true,
        location: {
          include: {
            city: true,
            neighborhood: true,
          },
        },
        category: true,
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        inventory: true,
        safety: true,
      },
    });
  }

  /**
   * Queries active marketplace listings strictly enforcing safety status and time cutoffs
   */
  async listActiveListings(filter?: {
    categoryId?: string;
    merchantId?: string;
    cityId?: string;
    limit?: number;
  }) {
    const now = new Date();

    return await prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        safety: {
          safetyStatus: SafetyStatus.APPROVED,
        },
        pickupEnd: {
          gt: now,
        },
        categoryId: filter?.categoryId,
        merchantId: filter?.merchantId,
        location: filter?.cityId ? { cityId: filter.cityId } : undefined,
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessNameFa: true,
            businessType: true,
            ratingAverage: true,
            ratingCount: true,
          },
        },
        location: {
          select: {
            id: true,
            addressFa: true,
            latitude: true,
            longitude: true,
            city: true,
            neighborhood: true,
          },
        },
        category: true,
        inventory: true,
        safety: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filter?.limit ?? 50,
    });
  }

  /**
   * Updates status of a listing (e.g. PAUSED, SOLD_OUT, EXPIRED)
   */
  async updateListingStatus(id: string, status: ListingStatus) {
    return await prisma.listing.update({
      where: { id },
      data: { status },
    });
  }
}

export const listingService = new ListingService();
