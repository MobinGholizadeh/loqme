CREATE TYPE "MerchantApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "MerchantHours" ALTER COLUMN "defaultPickupStart" DROP NOT NULL;
ALTER TABLE "MerchantHours" ALTER COLUMN "defaultPickupEnd" DROP NOT NULL;
ALTER TABLE "Merchant" ADD COLUMN "mapirPlaceId" TEXT;
CREATE UNIQUE INDEX "Merchant_mapirPlaceId_key" ON "Merchant"("mapirPlaceId");
CREATE TABLE "MerchantApplication" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "businessNameFa" TEXT NOT NULL,
  "businessType" "BusinessType" NOT NULL,
  "cityId" TEXT NOT NULL,
  "addressFa" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "phone" TEXT,
  "licenseNumber" TEXT,
  "mapirPlaceId" TEXT,
  "hours" JSONB NOT NULL,
  "status" "MerchantApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "reviewReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "merchantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MerchantApplication_coordinates_check" CHECK ("latitude" BETWEEN 24 AND 40 AND "longitude" BETWEEN 44 AND 64),
  CONSTRAINT "MerchantApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MerchantApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MerchantApplication_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MerchantApplication_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MerchantApplication_applicantId_key" ON "MerchantApplication"("applicantId");
CREATE UNIQUE INDEX "MerchantApplication_merchantId_key" ON "MerchantApplication"("merchantId");
CREATE INDEX "MerchantApplication_status_createdAt_idx" ON "MerchantApplication"("status", "createdAt");
CREATE INDEX "MerchantApplication_mapirPlaceId_idx" ON "MerchantApplication"("mapirPlaceId");
