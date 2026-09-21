ALTER TABLE "Review"
  ALTER COLUMN "qualityRating" DROP NOT NULL,
  ALTER COLUMN "valueRating" DROP NOT NULL,
  ADD COLUMN "collectionRating" INTEGER,
  ADD COLUMN "varietyRating" INTEGER,
  ADD COLUMN "quantityRating" INTEGER;

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_collectionRating_range" CHECK ("collectionRating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Review_varietyRating_range" CHECK ("varietyRating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Review_quantityRating_range" CHECK ("quantityRating" BETWEEN 1 AND 5);
