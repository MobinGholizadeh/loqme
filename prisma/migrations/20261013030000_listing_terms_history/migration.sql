BEGIN;
ALTER TABLE "OrderItem" ADD COLUMN "termsSnapshot" JSONB;
CREATE FUNCTION loqme_listing_terms(listing_id TEXT) RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'safety', (SELECT to_jsonb(s)-'id'-'listingId'-'createdAt'-'updatedAt' FROM "ListingSafety" s WHERE s."listingId"=listing_id),
    'images', COALESCE((SELECT jsonb_agg(jsonb_build_object('imageUrl',i."imageUrl",'isPrimary',i."isPrimary") ORDER BY i."displayOrder",i.id) FROM "ListingImage" i WHERE i."listingId"=listing_id),'[]'::jsonb),
    'pickupDetails', (SELECT a."valueJson" FROM "ListingAttributes" a WHERE a."listingId"=listing_id AND a.key='pickupDetails' ORDER BY a.id LIMIT 1)
  )
$$;
CREATE OR REPLACE FUNCTION loqme_listing_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."merchantLocationId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "MerchantLocation" WHERE id=NEW."merchantLocationId" AND "merchantId"=NEW."merchantId"
  ) THEN RAISE EXCEPTION 'Listing location tenant mismatch'; END IF;
  IF TG_OP='UPDATE' AND NEW."merchantId" <> OLD."merchantId" THEN RAISE EXCEPTION 'Listing tenant is immutable'; END IF;
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'updatedAt') = (to_jsonb(OLD)-'updatedAt') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN NEW.revision := OLD.revision+1; END IF;
  INSERT INTO "ListingRevision" ("listingId","merchantId","locationId","revision","kind","actorId","snapshot")
  VALUES (NEW.id,NEW."merchantId",NEW."merchantLocationId",NEW.revision,
    CASE WHEN TG_OP='INSERT' THEN 'CREATED' ELSE 'CHANGED' END,
    nullif(current_setting('loqme.actor_id',true),''),
    jsonb_build_object('titleFa',NEW."titleFa",'descriptionFa',NEW."descriptionFa",'categoryId',NEW."categoryId",
      'type',NEW.type,'status',NEW.status,'originalPriceToman',NEW."originalPriceToman"::text,
      'discountedPriceToman',NEW."discountedPriceToman"::text,'pickupStart',NEW."pickupStart",'pickupEnd',NEW."pickupEnd",
      'terms',loqme_listing_terms(NEW.id)));
  RETURN NEW;
END $$;
CREATE FUNCTION loqme_child_listing_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE listing_id TEXT;
BEGIN
  IF TG_OP='UPDATE' AND NEW."listingId"<>OLD."listingId" THEN RAISE EXCEPTION 'Listing child identity is immutable'; END IF;
  IF TG_OP='UPDATE' AND to_jsonb(NEW)=to_jsonb(OLD) THEN RETURN NEW; END IF;
  listing_id:=CASE WHEN TG_OP='DELETE' THEN OLD."listingId" ELSE NEW."listingId" END;
  UPDATE "Listing" SET revision=revision+1 WHERE id=listing_id;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER safety_history AFTER INSERT OR UPDATE OR DELETE ON "ListingSafety" FOR EACH ROW EXECUTE FUNCTION loqme_child_listing_history();
CREATE TRIGGER image_history AFTER INSERT OR UPDATE OR DELETE ON "ListingImage" FOR EACH ROW EXECUTE FUNCTION loqme_child_listing_history();
CREATE TRIGGER attributes_history AFTER INSERT OR UPDATE OR DELETE ON "ListingAttributes" FOR EACH ROW EXECUTE FUNCTION loqme_child_listing_history();
CREATE FUNCTION loqme_order_item_terms() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW."termsSnapshot":=loqme_listing_terms(NEW."listingId"); RETURN NEW; END $$;
CREATE TRIGGER order_item_terms BEFORE INSERT ON "OrderItem" FOR EACH ROW EXECUTE FUNCTION loqme_order_item_terms();
COMMIT;
