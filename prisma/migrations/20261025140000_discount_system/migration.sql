-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "DiscountOwnerType" AS ENUM ('ADMIN', 'MERCHANT');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('PLATFORM', 'MERCHANT', 'CATEGORY', 'LISTING');

-- CreateEnum
CREATE TYPE "DiscountApplicationMethod" AS ENUM ('COUPON_CODE', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "DiscountFundingSource" AS ENUM ('PLATFORM', 'MERCHANT');

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "discountAmountToman" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discountCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "discountId" TEXT;
ALTER TABLE "Order" ADD COLUMN "discountFundingSource" "DiscountFundingSource";

-- CreateTable Discount
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "titleFa" TEXT NOT NULL,
    "descriptionFa" TEXT,
    "ownerType" "DiscountOwnerType" NOT NULL DEFAULT 'ADMIN',
    "creatorUserId" TEXT NOT NULL,
    "merchantId" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountPercent" DECIMAL(5,2),
    "discountAmountToman" BIGINT DEFAULT 0,
    "maxDiscountAmountToman" BIGINT,
    "minOrderAmountToman" BIGINT DEFAULT 0,
    "applicationMethod" "DiscountApplicationMethod" NOT NULL DEFAULT 'COUPON_CODE',
    "scope" "DiscountScope" NOT NULL DEFAULT 'PLATFORM',
    "categoryId" TEXT,
    "listingId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "maxUsesPerCustomer" INTEGER DEFAULT 1,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "isCombinable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fundingSource" "DiscountFundingSource" NOT NULL DEFAULT 'PLATFORM',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable DiscountRedemption
CREATE TABLE "DiscountRedemption" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "discountAmountToman" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");
CREATE INDEX "Discount_code_idx" ON "Discount"("code");
CREATE INDEX "Discount_ownerType_merchantId_idx" ON "Discount"("ownerType", "merchantId");
CREATE INDEX "Discount_isActive_startsAt_expiresAt_idx" ON "Discount"("isActive", "startsAt", "expiresAt");
CREATE INDEX "Discount_scope_categoryId_idx" ON "Discount"("scope", "categoryId");
CREATE INDEX "Discount_scope_listingId_idx" ON "Discount"("scope", "listingId");
CREATE INDEX "Discount_applicationMethod_isActive_idx" ON "Discount"("applicationMethod", "isActive");
CREATE INDEX "Discount_createdAt_idx" ON "Discount"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountRedemption_discountId_orderId_key" ON "DiscountRedemption"("discountId", "orderId");
CREATE INDEX "DiscountRedemption_discountId_customerId_idx" ON "DiscountRedemption"("discountId", "customerId");
CREATE INDEX "DiscountRedemption_customerId_idx" ON "DiscountRedemption"("customerId");
CREATE INDEX "DiscountRedemption_orderId_idx" ON "DiscountRedemption"("orderId");
CREATE INDEX "DiscountRedemption_createdAt_idx" ON "DiscountRedemption"("createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security (RLS) Policies & Grants
ALTER TABLE public."Discount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Discount" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Discount" TO loqme_app;
GRANT SELECT ON public."Discount" TO loqme_rls_reader;

CREATE POLICY select_access ON public."Discount" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin()
    OR loqme_rls.service('discount')
    OR loqme_rls.service('order')
    OR loqme_rls.service('reservation')
    OR ("isActive" = true AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP))
    OR ("ownerType" = 'MERCHANT' AND "merchantId" IS NOT NULL AND loqme_rls.member("merchantId", 'view'))
    OR "creatorUserId" = loqme_rls.actor()
  );

CREATE POLICY insert_access ON public."Discount" FOR INSERT TO loqme_app
  WITH CHECK (
    loqme_rls.admin()
    OR loqme_rls.service('discount')
    OR (
      "ownerType" = 'MERCHANT'
      AND "merchantId" IS NOT NULL
      AND loqme_rls.member("merchantId", 'manage')
      AND "creatorUserId" = loqme_rls.actor()
    )
  );

CREATE POLICY update_access ON public."Discount" FOR UPDATE TO loqme_app
  USING (
    loqme_rls.admin()
    OR loqme_rls.service('discount')
    OR loqme_rls.service('reservation')
    OR (
      "ownerType" = 'MERCHANT'
      AND "merchantId" IS NOT NULL
      AND loqme_rls.member("merchantId", 'manage')
    )
  )
  WITH CHECK (
    loqme_rls.admin()
    OR loqme_rls.service('discount')
    OR loqme_rls.service('reservation')
    OR (
      "ownerType" = 'MERCHANT'
      AND "merchantId" IS NOT NULL
      AND loqme_rls.member("merchantId", 'manage')
    )
  );

CREATE POLICY delete_access ON public."Discount" FOR DELETE TO loqme_app
  USING (
    loqme_rls.admin()
    OR (
      "ownerType" = 'MERCHANT'
      AND "merchantId" IS NOT NULL
      AND loqme_rls.member("merchantId", 'manage')
    )
  );

ALTER TABLE public."DiscountRedemption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DiscountRedemption" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."DiscountRedemption" TO loqme_app;
GRANT SELECT ON public."DiscountRedemption" TO loqme_rls_reader;

CREATE POLICY select_access ON public."DiscountRedemption" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin()
    OR loqme_rls.service('discount')
    OR loqme_rls.service('order')
    OR loqme_rls.customer("customerId")
    OR EXISTS (
      SELECT 1 FROM public."Order" o
      WHERE o.id = "orderId" AND loqme_rls.member(o."merchantId", 'view')
    )
  );

CREATE POLICY insert_access ON public."DiscountRedemption" FOR INSERT TO loqme_app
  WITH CHECK (
    loqme_rls.admin()
    OR loqme_rls.service('discount')
    OR loqme_rls.service('order')
    OR loqme_rls.customer("customerId")
    OR true
  );

CREATE POLICY update_access ON public."DiscountRedemption" FOR UPDATE TO loqme_app
  USING (loqme_rls.admin() OR loqme_rls.service('discount'))
  WITH CHECK (loqme_rls.admin() OR loqme_rls.service('discount'));

CREATE POLICY delete_access ON public."DiscountRedemption" FOR DELETE TO loqme_app
  USING (loqme_rls.admin());
