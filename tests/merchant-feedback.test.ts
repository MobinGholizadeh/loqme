vi.mock("@/domain/reservation/reservation.service", () => ({ reservationService: { sweepExpiredReservations: vi.fn().mockResolvedValue(0) } }));
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import {
  CreateListingSchema,
  FastCreateListingSchema,
} from "@loqme/validation";
import { PRESET_TEMPLATES } from "@/components/merchant/FastListingModal";
import {
  normalizeListingImage,
  listingImageStorage,
} from "@/domain/listing/image-storage";

const mocks = vi.hoisted(() => ({
  listings: vi.fn(),
  nearby: vi.fn(),
  authorize: vi.fn(),
  category: vi.fn(),
  create: vi.fn(),
  session: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findMany: mocks.listings },
    category: { findUnique: mocks.category },
  },
}));
vi.mock("@/domain/merchant/merchant.service", () => ({
  merchantService: {
    findNearby: mocks.nearby,
    resolveMerchantAndAuthorize: mocks.authorize,
  },
}));
vi.mock("@/domain/listing/listing.service", () => ({
  listingService: { createListing: mocks.create },
}));
vi.mock("@/lib/auth/session", () => ({
  extractSessionToken: () => "test",
  verifySessionToken: mocks.session,
}));
import { GET } from "@/app/api/listings/nearby/route";
import { POST } from "@/app/api/merchant/listings/route";
import { POST as upload } from "@/app/api/merchant/listings/image/route";

const merchantId = "00000000-0000-4000-8000-000000000001";
function input(template = PRESET_TEMPLATES[0]) {
  return {
    imageUrl: '/listing-defaults/bread.png',
    categorySlug: template.categorySlug,
    titleFa: template.titleFa,
    descriptionFa: template.descriptionFa,
    originalPriceToman: template.suggestedOriginal,
    discountedPriceToman: template.suggestedDiscounted,
    quantity: template.defaultQuantity,
    temperatureRequirement: template.temperature,
  };
}

describe("CP10.9 merchant feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ userId: "user", role: "MERCHANT_OWNER" });
    mocks.authorize.mockResolvedValue({
      merchant: { id: merchantId, locations: [] },
    });
    mocks.category.mockResolvedValue({ id: "category" });
    mocks.create.mockResolvedValue({
      id: "new",
      titleFa: "بسته",
      originalPriceToman: 100,
      discountedPriceToman: 50,
      inventory: { totalQuantity: 2 },
      status: "PUBLISHED",
    });
  });
  it.each(PRESET_TEMPLATES)(
    "publishes $id through compatible fast/domain contracts",
    async (template) => {
      const fast = FastCreateListingSchema.parse(input(template));
      expect([
        "bakery",
        "cafe",
        "restaurant",
        "supermarket",
        "produce",
        "deli",
      ]).toContain(fast.categorySlug);
      expect(
        CreateListingSchema.safeParse({
          ...fast,
          merchantId,
          categoryId: "category",
          pickupDate: new Date(),
          pickupStart: new Date(),
          pickupEnd: new Date(Date.now() + 3600000),
        }).success,
      ).toBe(true);
      const response = await POST(
        new NextRequest("http://localhost/api/merchant/listings", {
          method: "POST",
          body: JSON.stringify(fast),
        }),
      );
      expect(response.status).toBe(200);
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperatureRequirement: template.temperature,
          categoryId: "category",
        }),
      );
    },
  );
  it("rejects unknown categories instead of silently assigning the first", async () => {
    mocks.category.mockResolvedValue(null);
    const response = await POST(
      new NextRequest("http://localhost/api/merchant/listings", {
        method: "POST",
        body: JSON.stringify(input()),
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each(["REFRIGERATED", "HEATED"])(
    "rejects stale enum %s with a Persian error",
    async (temperatureRequirement) => {
      const response = await POST(
        new NextRequest("http://localhost/api/merchant/listings", {
          method: "POST",
          body: JSON.stringify({ ...input(), temperatureRequirement }),
        }),
      );
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.message).not.toContain("invalid_enum");
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );
  it("all-region feed skips radius lookup, applies server filters and returns region labels", async () => {
    mocks.listings.mockResolvedValue([
      {
        id: "one",
        merchantId,
        merchant: {
          businessNameFa: "فروشگاه",
          businessType: "BAKERY",
          locations: [],
        },
        location: {
          city: { nameFa: "ارومیه" },
          neighborhood: { nameFa: "خیام" },
          latitude: 37.5,
          longitude: 45,
          addressFa: "خیام",
        },
        category: { slug: "bakery", nameFa: "نان" },
        inventory: { totalQuantity: 4, soldQuantity: 1, reservedQuantity: 1 },
        safety: { safetyStatus: "APPROVED" },
        images: [],
        originalPriceToman: 100,
        discountedPriceToman: 50,
        pickupStart: new Date(),
        pickupEnd: new Date(Date.now() + 3600000),
        type: "SURPRISE_BAG",
      },
    ]);
    const response = await GET(
      new NextRequest(
        "http://localhost/api/listings/nearby?scope=all&categorySlug=bakery&q=نان&maxPriceToman=100",
      ),
    );
    expect(mocks.nearby).not.toHaveBeenCalled();
    expect(mocks.listings).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          merchantId: undefined,
          category: { slug: "bakery" },
          merchant: { verificationStatus: "APPROVED", businessType: undefined },
          discountedPriceToman: { lte: 100n },
        }),
      }),
    );
    expect((await response.json()).data[0]).toMatchObject({
      cityNameFa: "ارومیه",
      neighborhoodNameFa: "خیام",
      remainingQuantity: 2,
    });
  });
  it("rejects invalid feed pagination", async () => {
    expect(
      (
        await GET(
          new NextRequest(
            "http://localhost/api/listings/nearby?scope=all&offset=-1",
          ),
        )
      ).status,
    ).toBe(400);
  });
  it("normalizes gallery images to metadata-free webp and rejects non-images", async () => {
    const png = await sharp({
      create: { width: 20, height: 10, channels: 3, background: "teal" },
    })
      .png()
      .toBuffer();
    const output = await normalizeListingImage(png);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    await expect(
      normalizeListingImage(Buffer.from("<svg></svg>")),
    ).rejects.toThrow();
    await expect(
      normalizeListingImage(Buffer.alloc(6 * 1024 * 1024)),
    ).rejects.toThrow();
  });
  it("rejects cross-merchant, remote and traversal image references", async () => {
    for (const url of [
      "https://example.com/a.png",
      "/api/listing-images/other/photo.webp",
      `/api/listing-images/${merchantId}/../secret.webp`,
    ])
      await expect(
        listingImageStorage.authorize(merchantId, url),
      ).rejects.toThrow();
    await expect(
      listingImageStorage.authorize(merchantId, "/listing-defaults/bread.png"),
    ).resolves.toBeUndefined();
  });
  it.each(["CUSTOMER", "ADMIN"])(
    "denies gallery upload to %s",
    async (role) => {
      mocks.session.mockResolvedValue({ userId: "user", role });
      expect(
        (
          await upload(
            new NextRequest("http://localhost/api/merchant/listings/image", {
              method: "POST",
            }),
          )
        ).status,
      ).toBe(403);
      expect(mocks.authorize).not.toHaveBeenCalled();
    },
  );
});
