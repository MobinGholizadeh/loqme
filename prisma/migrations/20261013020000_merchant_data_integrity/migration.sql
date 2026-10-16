BEGIN;
CREATE FUNCTION loqme_immutable_snapshot() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW)-'id') IS DISTINCT FROM (to_jsonb(OLD)-'id') THEN
    RAISE EXCEPTION 'Purchased item facts are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_item_immutable BEFORE UPDATE ON "OrderItem" FOR EACH ROW EXECUTE FUNCTION loqme_immutable_snapshot();

CREATE FUNCTION loqme_order_allocation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF OLD."acceptedPaymentId" IS NOT NULL AND NEW."acceptedPaymentId" IS DISTINCT FROM OLD."acceptedPaymentId" THEN
      RAISE EXCEPTION 'Accepted payment is immutable';
    END IF;
    IF OLD."paidAt" IS NOT NULL AND NEW."paidAt" IS DISTINCT FROM OLD."paidAt" THEN RAISE EXCEPTION 'Payment event time is immutable'; END IF;
    IF ROW(NEW."merchantId",NEW."totalAmountToman",NEW."commissionPercent",NEW."commissionAmountToman",NEW."merchantPayoutAmountToman")
      IS DISTINCT FROM ROW(OLD."merchantId",OLD."totalAmountToman",OLD."commissionPercent",OLD."commissionAmountToman",OLD."merchantPayoutAmountToman") THEN
      RAISE EXCEPTION 'Order financial facts are immutable';
    END IF;
  END IF;
  IF NEW."acceptedPaymentId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Payment" p WHERE p.id=NEW."acceptedPaymentId" AND p."orderId"=NEW.id
      AND p."amountToman"=NEW."totalAmountToman" AND p.status IN ('SUCCESS','REFUNDED')
  ) THEN RAISE EXCEPTION 'Invalid payment allocation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_allocation BEFORE INSERT OR UPDATE ON "Order" FOR EACH ROW EXECUTE FUNCTION loqme_order_allocation();
CREATE FUNCTION loqme_history_append_only() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'History is append only'; END $$;
CREATE TRIGGER listing_revision_append_only BEFORE UPDATE OR DELETE ON "ListingRevision" FOR EACH ROW EXECUTE FUNCTION loqme_history_append_only();
CREATE TRIGGER inventory_movement_append_only BEFORE UPDATE OR DELETE ON "ListingInventoryMovement" FOR EACH ROW EXECUTE FUNCTION loqme_history_append_only();
CREATE INDEX "Payment_verifiedAt_idx" ON "Payment"("verifiedAt");
CREATE INDEX "Refund_settledAt_idx" ON "Refund"("settledAt");
CREATE INDEX "Order_merchantId_paidAt_idx" ON "Order"("merchantId","paidAt");
COMMIT;
