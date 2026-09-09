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

  /**
   * CP-07.3: Retrieves all listings for a merchant store with inventory and safety metadata
   */
  async getMerchantListings(merchantId: string) {
    return await prisma.listing.findMany({
      where: { merchantId },
      include: {
        category: true,
        inventory: true,
        safety: true,
        orderItems: {
          select: { id: true, quantity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * CP-07.3: 1-Tap Toggle between PUBLISHED and PAUSED with tenant security
   */
  async toggleListingStatus(merchantId: string, listingId: string, targetStatus?: ListingStatus) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error('بسته مورد نظر یافت نشد');
    }

    if (listing.merchantId !== merchantId) {
      throw new Error('عدم دسترسی: این بسته متعلق به فروشگاه شما نمی‌باشد');
    }

    const nextStatus =
      targetStatus ||
      (listing.status === ListingStatus.PUBLISHED ? ListingStatus.PAUSED : ListingStatus.PUBLISHED);

    return await prisma.listing.update({
      where: { id: listingId },
      data: { status: nextStatus },
      include: { inventory: true, safety: true, category: true },
    });
  }

  /**
   * CP-07.3: Fast Stock Adjustment (+/- 1) with concurrency and tenant security
   */
  async adjustListingStock(
    merchantId: string,
    listingId: string,
    options: { deltaQuantity?: number; totalQuantity?: number; status?: ListingStatus }
  ) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { inventory: true },
    });

    if (!listing) {
      throw new Error('بسته مورد نظر یافت نشد');
    }

    if (listing.merchantId !== merchantId) {
      throw new Error('عدم دسترسی: این بسته متعلق به فروشگاه شما نمی‌باشد');
    }

    const currentInventory = listing.inventory;
    if (!currentInventory) {
      throw new Error('رکورد موجودی برای این بسته یافت نشد');
    }

    let newTotal = currentInventory.totalQuantity;
    if (options.totalQuantity !== undefined) {
      newTotal = options.totalQuantity;
    } else if (options.deltaQuantity !== undefined) {
      newTotal = currentInventory.totalQuantity + options.deltaQuantity;
    }

    // Minimum check: totalQuantity cannot be less than reserved + sold
    const minRequired = currentInventory.reservedQuantity + currentInventory.soldQuantity;
    if (newTotal < minRequired) {
      throw new Error(
        `موجودی کل نمی‌تواند کمتر از بسته‌های در حال رزرو یا فروخته‌شده (${minRequired} عدد) باشد`
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update Inventory
      const updatedInventory = await tx.listingInventory.update({
        where: { id: currentInventory.id },
        data: {
          totalQuantity: newTotal,
          version: { increment: 1 },
        },
      });

      // 2. Adjust listing status if sold out or if stock added back
      let newListingStatus = options.status || listing.status;
      if (newTotal <= currentInventory.soldQuantity) {
        newListingStatus = ListingStatus.SOLD_OUT;
      } else if (listing.status === ListingStatus.SOLD_OUT && newTotal > currentInventory.soldQuantity) {
        newListingStatus = ListingStatus.PUBLISHED;
      }

      const updatedListing = await tx.listing.update({
        where: { id: listingId },
        data: { status: newListingStatus },
        include: { inventory: true, safety: true, category: true },
      });

      return {
        ...updatedListing,
        inventory: updatedInventory,
      };
    });
  }
}

export const listingService = new ListingService();

