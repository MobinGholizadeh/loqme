import { NextRequest, NextResponse } from "next/server";
import { listingService } from "@/domain/listing/listing.service";
import { merchantService } from "@/domain/merchant/merchant.service";
import { extractSessionToken, verifySessionToken } from "@/lib/auth/session";
import { FastCreateListingSchema } from "@loqme/validation";
import { prisma } from "@/lib/prisma";
import { ListingType } from "@prisma/client";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "لطفاً با حساب کاربری فروشگاه وارد شوید" },
        { status: 401 },
      );
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "نشست کاربری نامعتبر است" },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const merchantId = searchParams.get("merchantId") || undefined;

    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      session.userId,
      merchantId,
    );

    const listings = await listingService.getMerchantListings(merchant.id);

    // Format BigInt values for JSON response
    const formattedListings = listings.map((l) => ({
      id: l.id,
      merchantId: l.merchantId,
      merchantLocationId: l.merchantLocationId,
      categoryId: l.categoryId,
      categoryNameFa: l.category?.nameFa,
      type: l.type,
      titleFa: l.titleFa,
      descriptionFa: l.descriptionFa,
      originalPriceToman: Number(l.originalPriceToman),
      discountedPriceToman: Number(l.discountedPriceToman),
      discountPercent: Math.round(
        ((Number(l.originalPriceToman) - Number(l.discountedPriceToman)) /
          Number(l.originalPriceToman)) *
          100,
      ),
      pickupDate: l.pickupDate.toISOString(),
      pickupStart: l.pickupStart?.toISOString() || null,
      pickupEnd: l.pickupEnd?.toISOString() || null,
      status: l.status,
      totalQuantity: l.inventory?.totalQuantity || 0,
      reservedQuantity: l.inventory?.reservedQuantity || 0,
      soldQuantity: l.inventory?.soldQuantity || 0,
      remainingQuantity:
        (l.inventory?.totalQuantity || 0) -
        (l.inventory?.reservedQuantity || 0) -
        (l.inventory?.soldQuantity || 0),
      allergens: l.safety?.allergens || [],
      dietaryTags: l.safety?.dietaryTags || [],
      storageInstructionsFa: l.safety?.storageInstructionsFa,
      temperatureRequirement: l.safety?.temperatureRequirement,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      count: formattedListings.length,
      data: formattedListings,
    });
  } catch (error: any) {
    console.error("Error in GET /api/merchant/listings:", error);
    const status = error.message?.includes("عدم دسترسی") ? 403 : 500;
    return NextResponse.json(
      {
        success: false,
        message: error.message || "خطا در دریافت لیست بسته‌های فروشگاه",
      },
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "لطفاً با حساب کاربری فروشگاه وارد شوید" },
        { status: 401 },
      );
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "نشست کاربری نامعتبر است" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const merchantId =
      searchParams.get("merchantId") || body.merchantId || undefined;

    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      session.userId,
      merchantId,
    );

    const validated = FastCreateListingSchema.parse(body);

    // 1. Resolve category
    let categoryId = validated.categoryId;
    if (!categoryId && validated.categorySlug) {
      const cat = await prisma.category.findUnique({
        where: { slug: validated.categorySlug },
      });
      if (cat) categoryId = cat.id;
    }

    if (
      !categoryId ||
      !(await prisma.category.findUnique({ where: { id: categoryId } }))
    ) {
      throw new Error(
        "دسته‌بندی انتخاب‌شده یافت نشد؛ یک دسته‌بندی معتبر انتخاب کنید",
      );
    }

    // 2. Resolve pickup times
    const now = new Date();
    const pickupDateObj = validated.pickupDate
      ? new Date(validated.pickupDate)
      : new Date();

    let startDate: Date;
    let endDate: Date;

    if (validated.pickupStart && validated.pickupEnd) {
      if (
        validated.pickupStart.includes(":") &&
        !validated.pickupStart.includes("T")
      ) {
        // "HH:mm" format
        const [sH, sM] = validated.pickupStart.split(":").map(Number);
        const [eH, eM] = validated.pickupEnd.split(":").map(Number);

        startDate = new Date(pickupDateObj);
        startDate.setHours(sH, sM, 0, 0);

        endDate = new Date(pickupDateObj);
        endDate.setHours(eH, eM, 0, 0);
      } else {
        startDate = new Date(validated.pickupStart);
        endDate = new Date(validated.pickupEnd);
      }
    } else {
      // Default: 1 hour from now to 3 hours from now today
      startDate = new Date(now.getTime() + 60 * 60 * 1000);
      endDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    }

    if (endDate <= startDate) {
      throw new Error("زمان پایان تحویل باید بعد از زمان شروع تحویل باشد");
    }
    if (endDate <= now) {
      throw new Error(
        "بازه تحویل انتخاب‌شده گذشته است؛ زمان امروز را به آینده تغییر دهید",
      );
    }

    const primaryLocation = merchant.locations[0];

    const newListing = await listingService.createListing({
      imageUrl: validated.imageUrl,
      merchantId: merchant.id,
      merchantLocationId: primaryLocation?.id,
      categoryId,
      type: ListingType.SURPRISE_BAG,
      titleFa: validated.titleFa,
      descriptionFa: validated.descriptionFa,
      originalPriceToman: validated.originalPriceToman,
      discountedPriceToman: validated.discountedPriceToman,
      quantity: validated.quantity,
      pickupDate: pickupDateObj,
      pickupStart: startDate,
      pickupEnd: endDate,
      allergens: validated.allergens,
      dietaryTags: validated.dietaryTags,
      storageInstructionsFa: validated.storageInstructionsFa,
      temperatureRequirement: validated.temperatureRequirement,
    });

    return NextResponse.json({
      success: true,
      message: "بسته شگفت‌انگیز با موفقیت در بازار منتشر گردید",
      data: {
        id: newListing.id,
        titleFa: newListing.titleFa,
        originalPriceToman: Number(newListing.originalPriceToman),
        discountedPriceToman: Number(newListing.discountedPriceToman),
        quantity: newListing.inventory.totalQuantity,
        status: newListing.status,
      },
    });
  } catch (error: any) {
    console.error("Error in POST /api/merchant/listings:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "اطلاعات بسته معتبر نیست؛ عنوان، قیمت، زمان تحویل و شرایط نگهداری را بررسی کنید",
          errors: error.flatten(),
        },
        { status: 400 },
      );
    }
    const status = error.message?.includes("عدم دسترسی") ? 403 : 400;
    return NextResponse.json(
      { success: false, message: error.message || "خطا در ثبت و انتشار بسته" },
      { status },
    );
  }
}
