-- Nullable for existing stores; publication requires an owner-supplied cover.
ALTER TABLE "Merchant" ADD COLUMN "bannerImageUrl" TEXT;
