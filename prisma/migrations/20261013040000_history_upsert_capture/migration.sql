-- BEFORE triggers choose versions; AFTER triggers record only the action actually
-- performed. INSERT ... ON CONFLICT must not append a phantom opening event.
BEGIN;
CREATE FUNCTION loqme_inventory_version() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.version:=1;
  ELSIF ROW(NEW."totalQuantity",NEW."reservedQuantity",NEW."soldQuantity") IS DISTINCT FROM ROW(OLD."totalQuantity",OLD."reservedQuantity",OLD."soldQuantity") THEN NEW.version:=OLD.version+1;
  ELSE NEW.version:=OLD.version; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER inventory_history ON "ListingInventory";
CREATE TRIGGER inventory_version BEFORE INSERT OR UPDATE ON "ListingInventory" FOR EACH ROW EXECUTE FUNCTION loqme_inventory_version();
CREATE TRIGGER inventory_history AFTER INSERT OR UPDATE ON "ListingInventory" FOR EACH ROW EXECUTE FUNCTION loqme_inventory_history();
CREATE FUNCTION loqme_listing_version() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.revision:=1;
  ELSIF (to_jsonb(NEW)-'updatedAt') IS DISTINCT FROM (to_jsonb(OLD)-'updatedAt') THEN NEW.revision:=OLD.revision+1;
  ELSE NEW.revision:=OLD.revision; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER listing_history ON "Listing";
CREATE TRIGGER listing_version BEFORE INSERT OR UPDATE ON "Listing" FOR EACH ROW EXECUTE FUNCTION loqme_listing_version();
CREATE TRIGGER listing_history AFTER INSERT OR UPDATE ON "Listing" FOR EACH ROW EXECUTE FUNCTION loqme_listing_history();
COMMIT;
