-- Fix RLS guard_write function: ensure notesFa is included in newj array subtraction
CREATE OR REPLACE FUNCTION loqme_rls.guard_write() RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog AS $$
DECLARE oldj jsonb; newj jsonb; immutable text[]; field text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) OR loqme_rls.admin() THEN RETURN NEW; END IF;
  newj := to_jsonb(NEW);
  IF TG_OP='UPDATE' THEN
    oldj := to_jsonb(OLD);
    immutable := CASE TG_TABLE_NAME
      WHEN 'User' THEN ARRAY['id','mobile'] WHEN 'Customer' THEN ARRAY['id','userId']
      WHEN 'Merchant' THEN ARRAY['id','ownerUserId'] WHEN 'MerchantStaff' THEN ARRAY['id','merchantId','userId']
      WHEN 'MerchantApplication' THEN ARRAY['id','applicantId'] WHEN 'MerchantLocation' THEN ARRAY['id','merchantId']
      WHEN 'MerchantHours' THEN ARRAY['id','merchantLocationId'] WHEN 'Reservation' THEN ARRAY['id','customerId','listingId','quantity','expiresAt']
      WHEN 'Order' THEN ARRAY['id','customerId','merchantId','reservationId']
      WHEN 'PickupVerification' THEN ARRAY['id','orderId','otpCode','qrCodeHash']
      WHEN 'PaymentAttempt' THEN ARRAY['id','orderId','gateway'] WHEN 'ReconciliationCase' THEN ARRAY['id','merchantId','orderId','paymentId','caseKey']
      ELSE ARRAY['id'] END;
    FOREACH field IN ARRAY immutable LOOP
      IF oldj->field IS DISTINCT FROM newj->field THEN RAISE EXCEPTION 'RLS: immutable ownership field %.%', TG_TABLE_NAME, field USING ERRCODE='42501'; END IF;
    END LOOP;
  END IF;
  CASE TG_TABLE_NAME
  WHEN 'User' THEN
    IF TG_OP='INSERT' THEN
      IF NOT NEW."isActive" OR NOT ((loqme_rls.service('auth') AND NEW.role='CUSTOMER') OR
        (loqme_rls.service('invite') AND NEW.role='MERCHANT_STAFF')) THEN RAISE EXCEPTION 'RLS: invalid account creation' USING ERRCODE='42501'; END IF;
    ELSIF NOT (loqme_rls.service('invite') AND OLD.role='CUSTOMER' AND NEW.role='MERCHANT_STAFF'
      AND oldj-ARRAY['role','updatedAt']=newj-ARRAY['role','updatedAt']) THEN
      RAISE EXCEPTION 'RLS: account authority cannot be changed' USING ERRCODE='42501';
    END IF;
  WHEN 'Customer' THEN
    IF TG_OP='INSERT' AND NEW."cumulativeSavingsToman"<>0 THEN RAISE EXCEPTION 'RLS: savings are server computed' USING ERRCODE='42501'; END IF;
    IF TG_OP='UPDATE' AND OLD."cumulativeSavingsToman"<>NEW."cumulativeSavingsToman" AND NOT loqme_rls.service('payment') THEN
      RAISE EXCEPTION 'RLS: savings are server computed' USING ERRCODE='42501'; END IF;
  WHEN 'Merchant' THEN
    IF TG_OP='UPDATE' THEN
      IF loqme_rls.service('review') THEN
        IF oldj-ARRAY['ratingAverage','ratingCount','updatedAt']<>newj-ARRAY['ratingAverage','ratingCount','updatedAt'] THEN RAISE EXCEPTION 'RLS: only ratings may change' USING ERRCODE='42501'; END IF;
      ELSIF oldj-ARRAY['businessNameFa','businessType','licenseNumber','bannerImageUrl','updatedAt']<>newj-ARRAY['businessNameFa','businessType','licenseNumber','bannerImageUrl','updatedAt'] THEN
        RAISE EXCEPTION 'RLS: merchant approval, commission and ratings are server controlled' USING ERRCODE='42501'; END IF;
    END IF;
  WHEN 'MerchantStaff' THEN
    IF NEW.role='OWNER' OR (TG_OP='UPDATE' AND OLD.role='OWNER') THEN RAISE EXCEPTION 'RLS: ownership is admin controlled' USING ERRCODE='42501'; END IF;
  WHEN 'MerchantApplication' THEN
    IF NEW.status<>'PENDING' OR NEW."reviewedById" IS NOT NULL OR NEW."reviewedAt" IS NOT NULL OR NEW."merchantId" IS NOT NULL OR NEW."reviewReason" IS NOT NULL
      OR (TG_OP='UPDATE' AND OLD.status='APPROVED') THEN RAISE EXCEPTION 'RLS: application approval is admin controlled' USING ERRCODE='42501'; END IF;
  WHEN 'Listing' THEN
    IF TG_OP='UPDATE' AND NOT loqme_rls.member(OLD."merchantId",'manage') THEN
      IF oldj-ARRAY['status','revision','updatedAt']<>newj-ARRAY['status','revision','updatedAt'] OR NOT (
        (loqme_rls.service('safety') AND NEW.status='PAUSED') OR
        (OLD.status IN ('PUBLISHED','SOLD_OUT') AND NEW.status IN ('PUBLISHED','SOLD_OUT')) OR OLD.status=NEW.status)
      THEN RAISE EXCEPTION 'RLS: listing terms require management authority' USING ERRCODE='42501'; END IF;
    END IF;
  WHEN 'ListingInventory' THEN
    IF TG_OP='UPDATE' THEN
      IF OLD."totalQuantity"<>NEW."totalQuantity" AND NOT loqme_rls.listing_manage(NEW."listingId") THEN RAISE EXCEPTION 'RLS: stock total requires management authority' USING ERRCODE='42501'; END IF;
      IF OLD."soldQuantity"<>NEW."soldQuantity" AND NOT loqme_rls.service('payment') THEN RAISE EXCEPTION 'RLS: sold stock requires verified payment' USING ERRCODE='42501'; END IF;
    ELSIF NEW."soldQuantity"<>0 OR NEW."reservedQuantity"<>0 THEN RAISE EXCEPTION 'RLS: opening inventory cannot contain sales or holds' USING ERRCODE='42501'; END IF;
  WHEN 'ListingSafety' THEN
    IF TG_OP='UPDATE' AND OLD."safetyStatus" IN ('RESTRICTED','REJECTED') AND NEW."safetyStatus"<>OLD."safetyStatus" THEN
      RAISE EXCEPTION 'RLS: only an admin may lift a safety restriction' USING ERRCODE='42501'; END IF;
  WHEN 'Reservation' THEN
    IF TG_OP='INSERT' AND (NEW.status<>'PENDING' OR NEW.quantity<1 OR NEW.quantity>5) THEN RAISE EXCEPTION 'RLS: invalid reservation' USING ERRCODE='42501'; END IF;
    IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NOT loqme_rls.service('payment') AND NOT (
      OLD.status='PENDING' AND ((NEW.status='RELEASED' AND loqme_rls.customer(NEW."customerId")) OR
        (NEW.status='EXPIRED' AND NEW."expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')))) THEN
      RAISE EXCEPTION 'RLS: invalid reservation transition' USING ERRCODE='42501'; END IF;
  WHEN 'Order' THEN
    IF TG_OP='INSERT' AND (NEW.status<>'PENDING_PAYMENT' OR NEW."acceptedPaymentId" IS NOT NULL OR NEW."paidAt" IS NOT NULL) THEN RAISE EXCEPTION 'RLS: orders begin unpaid' USING ERRCODE='42501'; END IF;
    IF TG_OP='UPDATE' AND NOT loqme_rls.callback_order(OLD.id) AND oldj<>newj THEN
      -- Existing BEFORE INSERT OrderItem trigger captures authoritative pickup facts.
      IF pg_trigger_depth()>1 AND OLD.status='PENDING_PAYMENT' AND loqme_rls.customer(OLD."customerId")
        AND oldj-ARRAY['merchantLocationId','pickupAddressFa','updatedAt']=newj-ARRAY['merchantLocationId','pickupAddressFa','updatedAt'] THEN RETURN NEW; END IF;
      -- Merchant order management: allow updating pickup window, confirmation, and delay reason
      IF (loqme_rls.member(OLD."merchantId",'pickup') OR loqme_rls.member(OLD."merchantId",'manage'))
        AND oldj-ARRAY['pickupStart','pickupEnd','merchantConfirmedAt','confirmedByUserId','pickupWindowModifiedCount','delayReasonFa','pickupWindowHistory','notesFa','updatedAt']=newj-ARRAY['pickupStart','pickupEnd','merchantConfirmedAt','confirmedByUserId','pickupWindowModifiedCount','delayReasonFa','pickupWindowHistory','notesFa','updatedAt']
      THEN
        RETURN NEW;
      END IF;
      IF NOT loqme_rls.member(OLD."merchantId",'pickup') OR oldj-ARRAY['status','updatedAt']<>newj-ARRAY['status','updatedAt'] OR
        OLD.status NOT IN ('PAID','READY_FOR_PICKUP') OR NEW.status NOT IN ('COMPLETED','NO_SHOW') THEN RAISE EXCEPTION 'RLS: order payment state is server controlled' USING ERRCODE='42501'; END IF;
    END IF;
  WHEN 'Payment' THEN
    IF TG_OP='INSERT' AND (NEW.status<>'INITIATED' OR NEW."verifiedAt" IS NOT NULL OR NEW."referenceId" IS NOT NULL) THEN RAISE EXCEPTION 'RLS: payment verification is server controlled' USING ERRCODE='42501'; END IF;
  WHEN 'PickupVerification' THEN
    IF TG_OP='INSERT' AND (NEW."isVerified" OR NEW."verifiedAt" IS NOT NULL OR NEW."verifiedByUserId" IS NOT NULL OR NEW."verifiedByStaffId" IS NOT NULL OR NEW."attemptCount"<>0
      OR NOT EXISTS (SELECT 1 FROM public."Order" WHERE id=NEW."orderId" AND status IN ('PAID','READY_FOR_PICKUP','COMPLETED'))) THEN
      RAISE EXCEPTION 'RLS: pickup requires a paid order' USING ERRCODE='42501'; END IF;
  WHEN 'Review' THEN
    IF TG_OP='INSERT' AND (NEW."merchantReplyFa" IS NOT NULL OR NEW."merchantReplyAt" IS NOT NULL) THEN RAISE EXCEPTION 'RLS: customers cannot author merchant replies' USING ERRCODE='42501'; END IF;
    IF TG_OP='UPDATE' AND oldj-ARRAY['merchantReplyFa','merchantReplyAt','updatedAt']<>newj-ARRAY['merchantReplyFa','merchantReplyAt','updatedAt'] THEN RAISE EXCEPTION 'RLS: merchants can only edit their reply' USING ERRCODE='42501'; END IF;
  WHEN 'Complaint' THEN
    IF NEW.status<>'PENDING' OR NEW."resolvedByUserId" IS NOT NULL OR NEW."resolvedAt" IS NOT NULL OR NEW."refundId" IS NOT NULL OR NEW."adminNotesFa" IS NOT NULL THEN RAISE EXCEPTION 'RLS: complaint resolution requires admin' USING ERRCODE='42501'; END IF;
  WHEN 'AuditLog' THEN
    NEW."actorId" := loqme_rls.actor();
    SELECT role INTO NEW."actorRole" FROM public."User" WHERE id=NEW."actorId";
  WHEN 'ReconciliationCase' THEN
    IF NEW.status<>'OPEN' OR NEW.resolution IS NOT NULL OR NEW."resolvedBy" IS NOT NULL OR NEW."resolvedAt" IS NOT NULL THEN RAISE EXCEPTION 'RLS: reconciliation requires admin' USING ERRCODE='42501'; END IF;
  ELSE NULL;
  END CASE;
  RETURN NEW;
END $$;
