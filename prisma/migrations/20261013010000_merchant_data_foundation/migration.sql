-- LQ-MDAI-001. Additive capture: existing facts remain untouched/unknown.
BEGIN;
ALTER TABLE "Listing" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Order" ADD COLUMN "merchantLocationId" TEXT, ADD COLUMN "pickupAddressFa" TEXT,
  ADD COLUMN "acceptedPaymentId" TEXT, ADD COLUMN "paidAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Order_acceptedPaymentId_key" ON "Order"("acceptedPaymentId");
ALTER TABLE "OrderItem" ADD COLUMN "titleFaSnapshot" TEXT, ADD COLUMN "categoryIdSnapshot" TEXT,
  ADD COLUMN "categoryNameFaSnapshot" TEXT, ADD COLUMN "originalPriceTomanSnapshot" BIGINT,
  ADD COLUMN "pickupStartSnapshot" TIMESTAMP(3), ADD COLUMN "pickupEndSnapshot" TIMESTAMP(3),
  ADD COLUMN "listingRevisionSnapshot" INTEGER, ADD COLUMN "snapshotCapturedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Refund" ADD COLUMN "settledAt" TIMESTAMP(3);
ALTER TABLE "FinancialTransaction" ADD COLUMN "postingKey" TEXT;
CREATE UNIQUE INDEX "FinancialTransaction_postingKey_key" ON "FinancialTransaction"("postingKey");
ALTER TABLE "AuditLog" ADD COLUMN "merchantId" TEXT, ADD COLUMN "sourceKind" TEXT;

CREATE TABLE "ListingRevision" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, "listingId" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL, "locationId" TEXT, "revision" INTEGER NOT NULL,
  "kind" TEXT NOT NULL, "actorId" TEXT, "sourceKind" TEXT NOT NULL DEFAULT 'MARKETPLACE',
  "snapshot" JSONB NOT NULL, "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
);
CREATE UNIQUE INDEX "ListingRevision_listingId_revision_key" ON "ListingRevision"("listingId", "revision");
CREATE INDEX "ListingRevision_merchantId_recordedAt_idx" ON "ListingRevision"("merchantId", "recordedAt");
CREATE TABLE "ListingInventoryMovement" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, "listingId" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL, "locationId" TEXT, "inventoryVersion" INTEGER NOT NULL,
  "kind" TEXT NOT NULL, "deltaTotal" INTEGER NOT NULL, "deltaReserved" INTEGER NOT NULL,
  "deltaSold" INTEGER NOT NULL, "resultingTotal" INTEGER NOT NULL, "resultingReserved" INTEGER NOT NULL,
  "resultingSold" INTEGER NOT NULL, "actorId" TEXT, "reasonCode" TEXT,
  "sourceKind" TEXT NOT NULL DEFAULT 'MARKETPLACE',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
);
CREATE UNIQUE INDEX "ListingInventoryMovement_listingId_inventoryVersion_key" ON "ListingInventoryMovement"("listingId", "inventoryVersion");
CREATE INDEX "ListingInventoryMovement_merchantId_recordedAt_idx" ON "ListingInventoryMovement"("merchantId", "recordedAt");
CREATE TABLE "PaymentAttempt" (
  "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "gateway" "PaymentGatewayType" NOT NULL, "state" TEXT NOT NULL DEFAULT 'SUBMITTING',
  "authority" TEXT, "paymentUrl" TEXT, "safeCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "updatedAt" TIMESTAMP(3) NOT NULL,
  CHECK ("state" IN ('SUBMITTING','AWAITING_VERIFICATION','UNKNOWN','DECLINED','VERIFIED'))
);
CREATE UNIQUE INDEX "PaymentAttempt_authority_key" ON "PaymentAttempt"("authority");
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId", "createdAt");
-- A changed HTTP idempotency key cannot create a second active payment attempt.
CREATE UNIQUE INDEX "PaymentAttempt_one_active_order" ON "PaymentAttempt"("orderId") WHERE "state" <> 'DECLINED';
CREATE TABLE "ReconciliationCase" (
  "id" TEXT PRIMARY KEY, "merchantId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "paymentId" TEXT, "caseKey" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN', "resolution" TEXT, "resolvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "resolvedAt" TIMESTAMP(3),
  CHECK ("status" IN ('OPEN','RESOLVED'))
);
CREATE UNIQUE INDEX "ReconciliationCase_caseKey_key" ON "ReconciliationCase"("caseKey");
CREATE INDEX "ReconciliationCase_merchantId_status_createdAt_idx" ON "ReconciliationCase"("merchantId", "status", "createdAt");

-- This lock makes the opening baseline and activation of capture a single cutover.
LOCK TABLE "Listing", "ListingInventory" IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO "ListingRevision" ("listingId","merchantId","locationId","revision","kind","snapshot")
SELECT id,"merchantId","merchantLocationId",revision,'BASELINE',
  jsonb_build_object('titleFa',"titleFa",'categoryId',"categoryId",'type',type,'status',status,
    'originalPriceToman',"originalPriceToman"::text,'discountedPriceToman',"discountedPriceToman"::text,
    'pickupStart',"pickupStart",'pickupEnd',"pickupEnd") FROM "Listing";
INSERT INTO "ListingInventoryMovement" ("listingId","merchantId","locationId","inventoryVersion","kind",
  "deltaTotal","deltaReserved","deltaSold","resultingTotal","resultingReserved","resultingSold")
SELECT i."listingId",l."merchantId",l."merchantLocationId",i.version,'BASELINE',
  0,0,0,i."totalQuantity",i."reservedQuantity",i."soldQuantity" FROM "ListingInventory" i JOIN "Listing" l ON l.id=i."listingId";

CREATE FUNCTION loqme_listing_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."merchantLocationId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "MerchantLocation" WHERE id=NEW."merchantLocationId" AND "merchantId"=NEW."merchantId"
  ) THEN RAISE EXCEPTION 'Listing location tenant mismatch'; END IF;
  IF TG_OP='UPDATE' AND NEW."merchantId" <> OLD."merchantId" THEN RAISE EXCEPTION 'Listing tenant is immutable'; END IF;
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'updatedAt'-'revision') = (to_jsonb(OLD)-'updatedAt'-'revision') THEN
    NEW.revision := OLD.revision; RETURN NEW;
  END IF;
  IF TG_OP='UPDATE' THEN NEW.revision := OLD.revision+1; END IF;
  INSERT INTO "ListingRevision" ("listingId","merchantId","locationId","revision","kind","actorId","snapshot")
  VALUES (NEW.id,NEW."merchantId",NEW."merchantLocationId",NEW.revision,
    CASE WHEN TG_OP='INSERT' THEN 'CREATED' ELSE 'CHANGED' END,
    nullif(current_setting('loqme.actor_id',true),''),
    jsonb_build_object('titleFa',NEW."titleFa",'descriptionFa',NEW."descriptionFa",'categoryId',NEW."categoryId",
      'type',NEW.type,'status',NEW.status,'originalPriceToman',NEW."originalPriceToman"::text,
      'discountedPriceToman',NEW."discountedPriceToman"::text,'pickupStart',NEW."pickupStart",'pickupEnd',NEW."pickupEnd"));
  RETURN NEW;
END $$;
CREATE TRIGGER listing_history BEFORE INSERT OR UPDATE ON "Listing" FOR EACH ROW EXECUTE FUNCTION loqme_listing_history();

CREATE FUNCTION loqme_inventory_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE l "Listing"; dt INTEGER; dr INTEGER; ds INTEGER; kind TEXT;
BEGIN
  SELECT * INTO STRICT l FROM "Listing" WHERE id=NEW."listingId";
  IF TG_OP='UPDATE' THEN
    IF NEW."listingId"<>OLD."listingId" THEN RAISE EXCEPTION 'Inventory listing is immutable'; END IF;
    dt:=NEW."totalQuantity"-OLD."totalQuantity"; dr:=NEW."reservedQuantity"-OLD."reservedQuantity"; ds:=NEW."soldQuantity"-OLD."soldQuantity";
    IF dt=0 AND dr=0 AND ds=0 THEN NEW.version:=OLD.version; RETURN NEW; END IF;
    NEW.version:=OLD.version+1;
    kind:=CASE WHEN ds>0 AND dr=-ds AND dt=0 THEN 'CONFIRM_SOLD' WHEN dr>0 AND dt=0 AND ds=0 THEN 'RESERVE'
      WHEN dr<0 AND dt=0 AND ds=0 THEN 'RELEASE' ELSE 'ADJUST_ALLOCATION' END;
  ELSE dt:=NEW."totalQuantity"; dr:=NEW."reservedQuantity"; ds:=NEW."soldQuantity"; kind:='OPENING'; END IF;
  INSERT INTO "ListingInventoryMovement" ("listingId","merchantId","locationId","inventoryVersion","kind",
    "deltaTotal","deltaReserved","deltaSold","resultingTotal","resultingReserved","resultingSold","actorId","reasonCode")
  VALUES (NEW."listingId",l."merchantId",l."merchantLocationId",NEW.version,kind,dt,dr,ds,
    NEW."totalQuantity",NEW."reservedQuantity",NEW."soldQuantity",nullif(current_setting('loqme.actor_id',true),''),
    nullif(current_setting('loqme.reason_code',true),''));
  RETURN NEW;
END $$;
CREATE TRIGGER inventory_history BEFORE INSERT OR UPDATE ON "ListingInventory" FOR EACH ROW EXECUTE FUNCTION loqme_inventory_history();

-- Capture at the database boundary, including nested Prisma create and raw writers.
CREATE FUNCTION loqme_order_item_snapshot() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE l "Listing"; o "Order"; category_name TEXT; pickup_address TEXT;
BEGIN
  SELECT * INTO STRICT l FROM "Listing" WHERE id=NEW."listingId";
  SELECT * INTO STRICT o FROM "Order" WHERE id=NEW."orderId";
  IF l."merchantId"<>o."merchantId" THEN RAISE EXCEPTION 'Order item tenant mismatch'; END IF;
  IF o."merchantLocationId" IS NOT NULL AND o."merchantLocationId" IS DISTINCT FROM l."merchantLocationId" THEN
    RAISE EXCEPTION 'Order items must use one pickup location'; END IF;
  SELECT "nameFa" INTO category_name FROM "Category" WHERE id=l."categoryId";
  SELECT "addressFa" INTO pickup_address FROM "MerchantLocation" WHERE id=l."merchantLocationId";
  NEW."titleFaSnapshot":=l."titleFa"; NEW."categoryIdSnapshot":=l."categoryId";
  NEW."categoryNameFaSnapshot":=category_name; NEW."originalPriceTomanSnapshot":=l."originalPriceToman";
  NEW."pickupStartSnapshot":=l."pickupStart"; NEW."pickupEndSnapshot":=l."pickupEnd";
  NEW."listingRevisionSnapshot":=l.revision; NEW."snapshotCapturedAt":=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
  UPDATE "Order" SET "merchantLocationId"=l."merchantLocationId", "pickupAddressFa"=pickup_address WHERE id=o.id;
  RETURN NEW;
END $$;
CREATE TRIGGER order_item_snapshot BEFORE INSERT ON "OrderItem" FOR EACH ROW EXECUTE FUNCTION loqme_order_item_snapshot();
COMMIT;
