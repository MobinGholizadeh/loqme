import { describe, it, expect, vi, beforeEach } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  generateLocalBusinessSchema,
  generateProductListingSchema,
  generateBreadcrumbSchema,
  generateBrandSchema,
} from "@/lib/seo/structured-data";
import { toPersianDigits, formatToman } from "@loqme/validation";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

describe("Milestone M10 — UX, SEO, PWA & Performance Excellence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Progressive Web App (PWA) Manifest & Service Worker (CP-10.1)
  // =========================================================================
  describe("1. PWA Manifest & Service Worker Configuration", () => {
    it("generates valid Web App Manifest adhering to PWA standards", () => {
      const pwaManifest = manifest();

      expect(pwaManifest.name).toBe("لقمه | عرضه هوشمند مازاد روزانه غذا");
      expect(pwaManifest.short_name).toBe("لقمه");
      expect(pwaManifest.start_url).toBe("/");
      expect(pwaManifest.display).toBe("standalone");
      expect(pwaManifest.theme_color).toBe("#135E66");
      expect(pwaManifest.background_color).toBe("#FFFFFF");
      expect(pwaManifest.dir).toBe("rtl");
      expect(pwaManifest.lang).toBe("fa-IR");
      expect(Array.isArray(pwaManifest.icons)).toBe(true);
      expect(pwaManifest.icons?.length).toBeGreaterThanOrEqual(2);

      const hasMaskable = pwaManifest.icons?.some(
        (i) => i.purpose === "maskable",
      );
      expect(hasMaskable).toBe(true);
    });

    it("verifies service worker file exists and contains security bypasses", () => {
      const swPath = path.join(process.cwd(), "apps/web/public/sw.js");
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, "utf-8");
      // Precaches offline fallback page
      expect(swContent).toContain("/offline");
      // Strictly excludes private and API routes from cache
      expect(swContent).toContain("/api/");
      expect(swContent).toContain("/admin");
      expect(swContent).toContain("/checkout");
    });
  });

  // =========================================================================
  // 2. Robots.txt & Dynamic XML Sitemap (CP-10.2)
  // =========================================================================
  describe("2. Robots.txt Directives & Dynamic Sitemap", () => {
    it("enforces robots.txt security rules and points to sitemap.xml", () => {
      const robotsConfig = robots();

      expect(robotsConfig.sitemap).toBe("https://loqme.shop/sitemap.xml");

      const rules = robotsConfig.rules;
      expect(rules).toBeDefined();

      if (Array.isArray(rules)) {
        const defaultRule = rules[0];
        expect(defaultRule.allow).toContain("/");
        expect(defaultRule.disallow).toContain("/admin/");
        expect(defaultRule.disallow).toContain("/merchant/");
        expect(defaultRule.disallow).toContain("/api/");
        expect(defaultRule.disallow).toContain("/checkout/");
      } else {
        expect(rules?.allow).toContain("/");
        expect(rules?.disallow).toContain("/admin/");
        expect(rules?.disallow).toContain("/merchant/");
        expect(rules?.disallow).toContain("/api/");
        expect(rules?.disallow).toContain("/checkout/");
      }
    });

    it("generates dynamic sitemap indexing core routes, verified merchants and active listings", async () => {
      const mockMerchants = [
        { id: "mch-1", updatedAt: new Date("2026-09-08T10:00:00Z") },
        { id: "mch-2", updatedAt: new Date("2026-09-09T10:00:00Z") },
      ];

      const mockListings = [
        { id: "list-1", updatedAt: new Date("2026-09-10T08:00:00Z") },
      ];

      vi.spyOn(prisma.merchant, "findMany").mockResolvedValue(
        mockMerchants as any,
      );
      vi.spyOn(prisma.listing, "findMany").mockResolvedValue(
        mockListings as any,
      );

      const sitemapEntries = await sitemap();

      // Check static core URLs
      const urls = sitemapEntries.map((e) => e.url);
      expect(urls).toContain("https://loqme.shop");
      expect(urls).toContain("https://loqme.shop/explore");
      expect(urls).toContain("https://loqme.shop/about");
      expect(urls).not.toContain("https://loqme.shop/login");
      expect(urls).not.toContain("https://loqme.shop/register");
      expect(sitemapEntries[0].lastModified).toBeUndefined();

      // Check dynamic merchant URLs
      expect(urls).toContain("https://loqme.shop/merchants/mch-1");
      expect(urls).toContain("https://loqme.shop/merchants/mch-2");

      // Check dynamic listing URLs
      expect(urls).toContain("https://loqme.shop/listings/list-1");
    });
  });

  // =========================================================================
  // 3. Schema.org JSON-LD Structured Data (CP-10.3)
  // =========================================================================
  describe("3. Schema.org JSON-LD Structured Data Generators", () => {
    it("connects the Persian site name and Latin alias to one organization", () => {
      const graph = generateBrandSchema()['@graph'];
      const website = graph.find(item => item['@type'] === 'WebSite')!;
      const organization = graph.find(item => item['@type'] === 'Organization')!;
      expect(website.name).toBe('لقمه');
      expect(website.alternateName).toContain('Loqme');
      expect(website.publisher?.['@id']).toBe(organization['@id']);
      expect(website.url).toBe('https://loqme.shop/');
      expect(website.inLanguage).toBe('fa-IR');
    });
    it("generates compliant LocalBusiness structured data for stores", () => {
      const mockStore = {
        id: "store-urmia-1",
        businessNameFa: "نانوایی سنگک برکت",
        businessType: "BAKERY",
        ratingAverage: 4.8,
        ratingCount: 42,
        phone: "04433445566",
        locations: [
          {
            addressFa: "ارومیه، خیابان دانشکده، نبش کوچه ۱۲",
            latitude: 37.5512,
            longitude: 45.0763,
            city: { nameFa: "ارومیه" },
          },
        ],
      };

      const schema = generateLocalBusinessSchema(mockStore);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Bakery");
      expect(schema.name).toBe("نانوایی سنگک برکت");
      expect(schema.telephone).toBe("04433445566");
      expect(schema.address?.addressLocality).toBe("ارومیه");
      expect(schema.address?.addressCountry).toBe("IR");
      expect(schema.geo?.latitude).toBe(37.5512);
      expect(schema.geo?.longitude).toBe(45.0763);
      expect(schema.aggregateRating?.ratingValue).toBe("4.8");
      expect(schema.aggregateRating?.reviewCount).toBe(42);
    });

    it("generates compliant Product & Offer structured data for listings", () => {
      const mockListing = {
        id: "pkg-surp-1",
        titleFa: "بسته شگفت‌انگیز شیرینی دانمارکی",
        descriptionFa: "شامل شیرینی‌های پخت روز با کیفیت عالی",
        originalPriceToman: 120000,
        discountedPriceToman: 60000,
        status: "PUBLISHED",
        pickupEnd: "2026-09-10T20:00:00Z",
      };

      const mockMerchant = {
        id: "mch-pastry-1",
        businessNameFa: "قنادی ماه بانو",
      };

      const schema = generateProductListingSchema(mockListing, mockMerchant);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Product");
      expect(schema.name).toBe("بسته شگفت‌انگیز شیرینی دانمارکی");
      expect(schema.offers?.price).toBe(60000);
      expect(schema.offers?.availability).toBe("https://schema.org/InStock");
      expect(schema.offers?.seller?.name).toBe("قنادی ماه بانو");
      expect(schema.offers?.priceValidUntil).toBe("2026-09-10");
    });

    it("generates valid BreadcrumbList structured data", () => {
      const items = [
        { name: "خانه", url: "https://loqme.shop" },
        { name: "کاوش بسته‌ها", url: "https://loqme.shop/explore" },
        { name: "شیرینی دانمارکی", url: "https://loqme.shop/listings/1" },
      ];

      const schema = generateBreadcrumbSchema(items);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("BreadcrumbList");
      expect(schema.itemListElement).toHaveLength(3);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].name).toBe("خانه");
      expect(schema.itemListElement[2].position).toBe(3);
    });
  });

  // =========================================================================
  // 4. Persian Typography & Numeral Rendering (CP-10.5)
  // =========================================================================
  describe("4. Persian Typography & Numeral Formatting", () => {
    it("consistently transforms English digits to Persian numerals", () => {
      expect(toPersianDigits(12345)).toBe("۱۲۳۴۵");
      expect(toPersianDigits("09121234567")).toBe("۰۹۱۲۱۲۳۴۵۶۷");
      expect(toPersianDigits("20:30")).toBe("۲۰:۳۰");
    });

    it("formats Toman currency with Persian numerals and thousands separators", () => {
      expect(formatToman(25000)).toBe("۲۵,۰۰۰ تومان");
      expect(formatToman(1250000)).toBe("۱,۲۵۰,۰۰۰ تومان");
      expect(formatToman(0)).toBe("۰ تومان");
    });
  });
});
