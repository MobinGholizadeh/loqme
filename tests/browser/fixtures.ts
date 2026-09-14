import { Page } from "@playwright/test";
import { SignJWT } from "jose";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import QRCode from "qrcode";

export const now = new Date().toISOString();
export const later = new Date(Date.now() + 86400000).toISOString();
export const user = {
  userId: "ui-user",
  mobile: "09120000000",
  fullName: "کاربر آزمایش رابط",
  role: "CUSTOMER",
};
export const merchant = {
  id: "ui-store",
  businessNameFa: "نانوایی آزمایشی دانشکده",
  businessType: "BAKERY",
  ratingAverage: 4.6,
  ratingCount: 12,
  verificationStatus: "APPROVED",
  isFavorited: false,
};
export const location = {
  id: "ui-location",
  addressFa: "ارومیه، خیابان دانشکده",
  latitude: 37.5506,
  longitude: 45.0761,
  phone: "04433333333",
  cityNameFa: "ارومیه",
  neighborhoodNameFa: "دانشکده",
  hours: [],
};
export const listings = [
  "نان و شیرینی تازه",
  "بسته روزانه کافه",
  "سبد میوه روز",
]
  .map((titleFa, i) => ({
    id: `ui-listing-${i}`,
    merchantId: merchant.id,
    titleFa,
    storeNameFa: merchant.businessNameFa,
    businessType: "BAKERY",
    type: i === 2 ? "FLASH_DEAL" : "SURPRISE_BAG",
    categorySlug: ["bakery", "cafe", "produce"][i],
    categoryNameFa: "نان و شیرینی",
    originalPriceToman: 180000,
    discountedPriceToman: 65000,
    discountPercent: 64,
    remainingQuantity: 5,
    pickupWindowFa: "۱۸:۰۰ تا ۲۰:۰۰",
    pickupEndIso: later,
    distanceMeters: 350,
    safetyStatus: "SAFE",
    ...location,
    imageUrl: `/lifestyle-${i + 1}.jpg`,
    // Fixtures deliberately use bundled photos; live inventory never receives these sample URLs.
  }))
  .map((item, i) => ({ ...item, id: `ui-listing-${i}` }));
export const detail = {
  ...listings[0],
  merchantId: merchant.id,
  descriptionFa: "منتخبی از نان و شیرینی پخت امروز.",
  status: "PUBLISHED",
  savingsToman: 115000,
  pickupStart: now,
  pickupEnd: later,
  isExpired: false,
  isSoldOut: false,
  inventory: { totalQuantity: 5, availableQuantity: 5 },
  images: [{ imageUrl: "/lifestyle-1.jpg" }],
  safety: {
    safetyStatus: "SAFE",
    allergens: ["GLUTEN"],
    dietaryTags: [],
    storageInstructionsFa: "در جای خشک و خنک نگهداری شود.",
    temperatureRequirement: "AMBIENT",
  },
  category: {
    id: "ui-category",
    nameFa: "نان و شیرینی",
    slug: "bakery",
    iconUrl: null,
  },
  merchant: { ...merchant, location },
};
export const reservation = {
  id: "ui-reservation",
  listingId: detail.id,
  quantity: 1,
  status: "ACTIVE",
  expiresAt: later,
  remainingSeconds: 600,
  isExpired: false,
  listing: { ...listings[0], totalPriceToman: 65000, savingsToman: 115000 },
};
export const order = {
  id: "ui-order",
  orderNumber: "LQ-1024",
  merchantId: merchant.id,
  merchantNameFa: merchant.businessNameFa,
  merchantAddressFa: location.addressFa,
  listingTitleFa: detail.titleFa,
  quantity: 1,
  totalAmountToman: 65000,
  status: "PAID",
  pickupWindowFa: "۱۸:۰۰ تا ۲۰:۰۰",
  pickupEndIso: later,
  createdAt: now,
  merchant: { ...merchant, ...location, id: merchant.id },
  items: [
    {
      id: "ui-item",
      listingId: detail.id,
      titleFa: detail.titleFa,
      unitPriceToman: 65000,
      quantity: 1,
      subtotalToman: 65000,
      pickupStart: now,
      pickupEnd: later,
    },
  ],
  commissionAmountToman: 6500,
  merchantPayoutAmountToman: 58500,
  payment: {
    gateway: "MOCK",
    status: "VERIFIED",
    authority: "fixture",
    referenceId: "1024",
  },
};

export async function installFixtures(page: Page, role = "CUSTOMER") {
  const env = parseEnv(readFileSync("apps/web/.env", "utf8"));
  const secret =
    process.env.SESSION_SECRET ||
    env.SESSION_SECRET ||
    "loqme-development-session-super-secret-key-change-in-production-32c";
  const session = { ...user, role };
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
  await page
    .context()
    .addCookies([
      {
        name: "loqme_session",
        value: token,
        url: process.env.LOQME_TEST_URL || "http://localhost:3002",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  const qrDataUrl = await QRCode.toDataURL("isolated-ui-test-pickup");
  const data: Record<string, unknown> = {
    "/api/categories": ["bakery", "cafe", "restaurant", "supermarket", "produce", "deli"].map((slug) => ({ id: slug, slug, nameFa: slug })),
    "/api/listings/nearby": listings,
    "/api/listings/search": listings,
    "/api/listings/ui-listing-0": detail,
    "/api/merchants/ui-store": {
      ...merchant,
      location,
      activeListings: listings,
    },
    "/api/reservations/ui-reservation": reservation,
    "/api/orders": [order],
    "/api/orders/ui-order": order,
    "/api/pickup/credentials/ui-order": {
      ...order,
      orderId: order.id,
      otpCode: "1234",
      otpCodePersian: "۱۲۳۴",
      qrToken: "fixture",
      qrDataUrl,
      expiresInSeconds: 60,
      isVerified: false,
      pickupStartIso: now,
      isPastPickupEnd: false,
    },
    "/api/merchant/dashboard": {
      ...merchant,
      merchantId: merchant.id,
      activeListingsCount: 3,
      reservedBagsCount: 1,
      soldTodayCount: 8,
      pendingPickupsCount: 1,
      grossRevenueTodayToman: 520000,
      netPayoutTodayToman: 468000,
      nextPickupWindow: null,
    },
    "/api/merchant/listings": [
      {
        ...detail,
        categoryNameFa: "نان و شیرینی",
        totalQuantity: 5,
        availableQuantity: 5,
        reservedQuantity: 1,
        soldQuantity: 0,
        pickupWindowFa: order.pickupWindowFa,
      },
    ],
    "/api/merchant/pickup/queue": [
      {
        ...order,
        orderId: order.id,
        customerNameFa: user.fullName,
        customerMobileMasked: "0912***0000",
        otpCode: "1234",
        isVerified: false,
        isPastPickupEnd: false,
        pickupStartIso: now,
      },
    ],
    "/api/merchant/staff": [
      {
        id: "ui-staff",
        userId: user.userId,
        mobile: user.mobile,
        fullName: user.fullName,
        role: "CASHIER",
        canScanPickup: true,
        createdAt: now,
      },
    ],
    "/api/merchant/settings": {
      ...merchant,
      licenseNumber: "12345",
      commissionPercent: 10,
      primaryLocation: location,
      hours: [],
    },
    "/api/merchant/finance": {
      ...merchant,
      merchantId: merchant.id,
      commissionPercent: 10,
      grossSalesToman: 65000,
      platformCommissionToman: 6500,
      netPayableBalanceToman: 58500,
      totalOrdersCount: 1,
      completedOrdersCount: 0,
      transactions: [],
    },
    "/api/admin/dashboard": {
      activeMerchantsCount: 12,
      pendingMerchantsCount: 3,
      suspendedMerchantsCount: 0,
      activeListingsCount: 24,
      totalOrders24hCount: 16,
      gmv24hToman: 1234000,
      commission24hToman: 123400,
      openComplaintsCount: 1,
    },
    "/api/admin/merchants": [
      {
        ...merchant,
        verificationStatus: "PENDING",
        ownerMobile: user.mobile,
        ownerFullName: user.fullName,
        licenseNumber: "12345",
        commissionPercent: 10,
        addressFa: location.addressFa,
        cityNameFa: "ارومیه",
        activeListingsCount: 3,
        totalOrdersCount: 8,
        createdAt: now,
      },
    ],
    "/api/admin/customers": [
      {
        id: "ui-customer",
        ...user,
        isActive: true,
        cumulativeSavingsToman: 115000,
        totalOrdersCount: 1,
        complaintsCount: 0,
        createdAt: now,
      },
    ],
    "/api/admin/listings": [
      {
        ...detail,
        merchantNameFa: merchant.businessNameFa,
        categoryNameFa: "نان و شیرینی",
        quantity: 5,
        safetyStatus: "SAFE",
        createdAt: now,
      },
    ],
    "/api/admin/categories": [
      {
        id: "ui-category",
        slug: "bakery",
        nameFa: "نان و شیرینی",
        listingsCount: 3,
        createdAt: now,
      },
    ],
    "/api/admin/settings": {
      maintenanceMode: false,
      announcementBannerFa: "",
      activeSmsProvider: "MOCK",
    },
    "/api/admin/finance/settlements": {
      generatedAt: now,
      totalGmvToman: 65000,
      totalPlatformCommissionToman: 6500,
      totalRefundsToman: 0,
      totalNetPayableToman: 58500,
      merchants: [
        {
          merchantId: merchant.id,
          businessNameFa: merchant.businessNameFa,
          commissionPercent: 10,
          grossGmvToman: 65000,
          commissionCutToman: 6500,
          refundsDeductedToman: 0,
          netPayableToman: 58500,
          shabaNumber: "",
          ordersCount: 1,
        },
      ],
    },
    "/api/admin/analytics": {
      timeframe: "30D",
      startDateIso: now,
      endDateIso: later,
      kpis: {
        gmvToman: 65000,
        platformCommissionToman: 6500,
        averageOrderValueToman: 65000,
        totalOrdersCount: 1,
        totalBagsSold: 1,
        customerCumulativeSavingsToman: 115000,
        merchantNetPayoutToman: 58500,
        sellThroughRate: 20,
        pickupCompletionRate: 80,
        refundRate: 0,
        repeatCustomerRate: 10,
      },
      dailyTrends: [
        {
          dateIso: now,
          dateFa: "۲۲ شهریور",
          gmvToman: 65000,
          ordersCount: 1,
          commissionToman: 6500,
          soldBags: 1,
        },
      ],
      categoryDistribution: [
        {
          categoryId: "ui-category",
          categoryNameFa: "نان و شیرینی",
          listingsCount: 3,
          soldBagsCount: 1,
          gmvToman: 65000,
          percentage: 100,
        },
      ],
      neighborhoodDensity: [],
      cohorts: {
        totalCustomers: 10,
        activeOrderingCustomers: 5,
        repeatCustomers: 1,
        repeatRate14Days: 10,
        repeatRate30Days: 10,
      },
    },
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/session")
      return route.fulfill({
        json: { success: true, user: session, authenticated: true },
      });
    if (path === "/api/auth/request-otp")
      return route.fulfill({
        json: { success: true, mobile: user.mobile, expiresInSeconds: 2 },
      });
    if (path === "/api/auth/verify-otp")
      return route.fulfill({ json: { success: true, user: session } });
    if (path === "/api/reviews")
      return route.fulfill({ json: { success: true, items: [] } });
    if (path === "/api/admin/complaints" || path === "/api/admin/audit")
      return route.fulfill({ json: { success: true, items: [] } });
    if (path === "/api/reservations")
      return route.fulfill({ json: { success: true, data: reservation } });
    if (path === "/api/orders/checkout")
      return route.fulfill({
        json: {
          success: true,
          data: { paymentUrl: "/orders/ui-order/receipt?status=success" },
        },
      });
    if (route.request().method() !== "GET")
      return route.fulfill({
        json: { success: true, message: "ثبت شد", data: {}, isFavorited: true },
      });
    if (!(path in data)) throw new Error(`Unmocked API: ${path}`);
    await route.fulfill({ json: { success: true, data: data[path] } });
  });
}
