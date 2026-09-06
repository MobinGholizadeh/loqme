-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SURPRISE_BAG', 'FLASH_DEAL');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'SOLD_OUT', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SafetyStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'RESTRICTED', 'REJECTED', 'UNSAFE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TemperatureRequirement" AS ENUM ('ROOM_TEMP', 'CHILLED', 'FROZEN');

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 10.0,
ADD COLUMN     "licenseNumber" TEXT;

-- CreateTable
CREATE TABLE "Province" (
    "id" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Neighborhood" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantLocation" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "neighborhoodId" TEXT,
    "addressFa" TEXT NOT NULL,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "geom" geography(Point, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantHours" (
    "id" TEXT NOT NULL,
    "merchantLocationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "storeOpenTime" TEXT NOT NULL,
    "storeCloseTime" TEXT NOT NULL,
    "defaultPickupStart" TEXT NOT NULL,
    "defaultPickupEnd" TEXT NOT NULL,

    CONSTRAINT "MerchantHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "iconUrl" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "merchantLocationId" TEXT,
    "categoryId" TEXT NOT NULL,
    "type" "ListingType" NOT NULL DEFAULT 'SURPRISE_BAG',
    "titleFa" TEXT NOT NULL,
    "descriptionFa" TEXT,
    "originalPriceToman" BIGINT NOT NULL,
    "discountedPriceToman" BIGINT NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "pickupStart" TIMESTAMP(3) NOT NULL,
    "pickupEnd" TIMESTAMP(3) NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingImage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingInventory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingSafety" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "safetyStatus" "SafetyStatus" NOT NULL DEFAULT 'APPROVED',
    "allergens" TEXT[],
    "dietaryTags" TEXT[],
    "storageInstructionsFa" TEXT,
    "temperatureRequirement" "TemperatureRequirement" NOT NULL DEFAULT 'ROOM_TEMP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingSafety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingAttributes" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,

    CONSTRAINT "ListingAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Province_slug_key" ON "Province"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "City_provinceId_slug_key" ON "City"("provinceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Neighborhood_cityId_slug_key" ON "Neighborhood"("cityId", "slug");

-- CreateIndex
CREATE INDEX "MerchantLocation_merchantId_idx" ON "MerchantLocation"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantLocation_cityId_idx" ON "MerchantLocation"("cityId");

-- CreateIndex
CREATE INDEX "MerchantLocation_neighborhoodId_idx" ON "MerchantLocation"("neighborhoodId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantHours_merchantLocationId_dayOfWeek_key" ON "MerchantHours"("merchantLocationId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Listing_merchantId_idx" ON "Listing"("merchantId");

-- CreateIndex
CREATE INDEX "Listing_categoryId_idx" ON "Listing"("categoryId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_pickupDate_idx" ON "Listing"("pickupDate");

-- CreateIndex
CREATE INDEX "Listing_pickupEnd_idx" ON "Listing"("pickupEnd");

-- CreateIndex
CREATE INDEX "ListingImage_listingId_idx" ON "ListingImage"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingInventory_listingId_key" ON "ListingInventory"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingSafety_listingId_key" ON "ListingSafety"("listingId");

-- CreateIndex
CREATE INDEX "ListingAttributes_listingId_idx" ON "ListingAttributes"("listingId");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Neighborhood" ADD CONSTRAINT "Neighborhood_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantLocation" ADD CONSTRAINT "MerchantLocation_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantLocation" ADD CONSTRAINT "MerchantLocation_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantLocation" ADD CONSTRAINT "MerchantLocation_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "Neighborhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantHours" ADD CONSTRAINT "MerchantHours_merchantLocationId_fkey" FOREIGN KEY ("merchantLocationId") REFERENCES "MerchantLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_merchantLocationId_fkey" FOREIGN KEY ("merchantLocationId") REFERENCES "MerchantLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingInventory" ADD CONSTRAINT "ListingInventory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSafety" ADD CONSTRAINT "ListingSafety_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAttributes" ADD CONSTRAINT "ListingAttributes_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Synchronize MerchantLocation.geom with latitude/longitude
CREATE OR REPLACE FUNCTION update_merchant_location_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW."geom" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_merchant_location_geom ON "MerchantLocation";
CREATE TRIGGER trg_merchant_location_geom
BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "MerchantLocation"
FOR EACH ROW
EXECUTE FUNCTION update_merchant_location_geom();

-- Create GIST Spatial Index on MerchantLocation.geom
CREATE INDEX IF NOT EXISTS "idx_merchant_location_geom" ON "MerchantLocation" USING GIST("geom");

-- Database Check Constraints
ALTER TABLE "ListingInventory" ADD CONSTRAINT "chk_inventory_non_negative"
CHECK ("totalQuantity" >= 0 AND "reservedQuantity" >= 0 AND "soldQuantity" >= 0 AND "totalQuantity" >= ("reservedQuantity" + "soldQuantity"));

ALTER TABLE "Listing" ADD CONSTRAINT "chk_listing_price_consistency"
CHECK ("originalPriceToman" > 0 AND "discountedPriceToman" > 0 AND "discountedPriceToman" < "originalPriceToman");

ALTER TABLE "Listing" ADD CONSTRAINT "chk_listing_pickup_window"
CHECK ("pickupEnd" > "pickupStart");

