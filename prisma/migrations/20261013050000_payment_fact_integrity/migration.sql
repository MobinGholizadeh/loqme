BEGIN;
CREATE FUNCTION loqme_order_pickup_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."merchantLocationId",NEW."pickupAddressFa") IS DISTINCT FROM ROW(OLD."merchantLocationId",OLD."pickupAddressFa")
    AND EXISTS (SELECT 1 FROM "OrderItem" WHERE "orderId"=OLD.id) THEN
    RAISE EXCEPTION 'Purchased pickup location is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_pickup_immutable BEFORE UPDATE ON "Order" FOR EACH ROW EXECUTE FUNCTION loqme_order_pickup_immutable();
CREATE FUNCTION loqme_payment_fact_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."orderId",NEW.authority,NEW.gateway,NEW."amountToman") IS DISTINCT FROM ROW(OLD."orderId",OLD.authority,OLD.gateway,OLD."amountToman") THEN
    RAISE EXCEPTION 'Payment identity and amount are immutable';
  END IF;
  IF OLD."verifiedAt" IS NOT NULL AND NEW."verifiedAt" IS DISTINCT FROM OLD."verifiedAt" THEN RAISE EXCEPTION 'Verification time is immutable'; END IF;
  IF EXISTS (SELECT 1 FROM "Order" WHERE "acceptedPaymentId"=OLD.id) AND NEW.status NOT IN ('SUCCESS','REFUNDED') THEN RAISE EXCEPTION 'Allocated payment cannot lose verification'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payment_fact_immutable BEFORE UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION loqme_payment_fact_immutable();
CREATE FUNCTION loqme_refund_identity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Payment" WHERE id=NEW."paymentId" AND "orderId"=NEW."orderId") THEN RAISE EXCEPTION 'Refund payment/order mismatch'; END IF;
  IF TG_OP='UPDATE' AND (ROW(NEW."orderId",NEW."paymentId",NEW."amountToman") IS DISTINCT FROM ROW(OLD."orderId",OLD."paymentId",OLD."amountToman")
    OR (OLD."settledAt" IS NOT NULL AND NEW."settledAt" IS DISTINCT FROM OLD."settledAt")) THEN RAISE EXCEPTION 'Refund facts are immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER refund_identity BEFORE INSERT OR UPDATE ON "Refund" FOR EACH ROW EXECUTE FUNCTION loqme_refund_identity();
COMMIT;
