vi.mock("@/domain/reservation/reservation.service", () => ({ reservationService: { sweepExpiredReservations: vi.fn().mockResolvedValue(0) } }));
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { TOKENS, generateCssVariables } from "@loqme/design-tokens";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { listing: { findMany: mocks.findMany } },
}));
import { GET } from "@/app/api/listings/search/route";

describe("Stitch redesign contracts", () => {
  beforeEach(() => vi.clearAllMocks());
  it("exports all primitives as CSS variables without web-only token dependencies", () => {
    const css = generateCssVariables();
    expect(css["--color-background"]).toBe("#FFFFFF");
    for (const [family, shades] of Object.entries(TOKENS.colors)) {
      for (const [shade, value] of Object.entries(shades))
        expect(css[`--loqme-${family}-${shade}`]).toBe(value);
    }
    expect(TOKENS.radius.lg).toBe("8px");
  });
  it.each([
    { images: [] },
    { images: [{ imageUrl: "/uploads/actual-package.jpg" }] },
  ])(
    "search exposes primary photo without changing price/stock authority: %j",
    async ({ images }) => {
      mocks.findMany.mockResolvedValue([
        {
          id: "listing",
          status: "PUBLISHED",
          merchantId: "merchant",
          titleFa: "نان تازه",
          type: "SURPRISE_BAG",
          originalPriceToman: 100000,
          discountedPriceToman: 50000,
          pickupStart: new Date(),
          pickupEnd: new Date(Date.now() + 3600000),
          images,
          merchant: {
            businessNameFa: "فروشگاه",
            verificationStatus: "APPROVED",
            businessType: "BAKERY",
            locations: [],
          },
          category: { nameFa: "نان", slug: "bakery" },
          inventory: { totalQuantity: 8, reservedQuantity: 2, soldQuantity: 1 },
          safety: { safetyStatus: "APPROVED" },
        },
      ]);
      const response = await GET(
        new NextRequest("http://localhost/api/listings/search?q=نان&limit=50"),
      );
      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.data[0]).toMatchObject({
        imageUrl: images[0]?.imageUrl || null,
        discountedPriceToman: 50000,
        remainingQuantity: 5,
        safetyVerified: true,
      });
      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            images: { orderBy: { isPrimary: "desc" }, take: 1 },
          }),
        }),
      );
    },
  );
  it.each([
    "/api/orders",
    "/admin",
    "/merchant/orders",
    "/checkout/id",
    "/orders/id/receipt",
    "/profile",
    "/login",
  ])("service worker bypasses %s", (path) => {
    const handlers: Record<string, (event: unknown) => void> = {};
    runInNewContext(readFileSync("apps/web/public/sw.js", "utf8"), {
      URL,
      self: {
        location: { origin: "https://loqme.shop" },
        addEventListener: (name: string, fn: (event: unknown) => void) => {
          handlers[name] = fn;
        },
      },
    });
    const respondWith = vi.fn();
    handlers.fetch({
      request: {
        url: "https://loqme.shop" + path,
        method: "GET",
        headers: new Headers(),
        mode: "navigate",
      },
      respondWith,
    });
    expect(respondWith).not.toHaveBeenCalled();
  });
});
