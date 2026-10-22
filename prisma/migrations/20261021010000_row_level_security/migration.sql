-- Requires an administrative migration connection. Never run the application with it.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='loqme_app') THEN
    CREATE ROLE loqme_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='loqme_rls_reader') THEN
    CREATE ROLE loqme_rls_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='loqme_app' AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcanlogin))
    OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname='loqme_rls_reader' AND (rolsuper OR rolcreaterole OR rolcanlogin OR NOT rolbypassrls)) THEN
    RAISE EXCEPTION 'Unsafe pre-existing Loqme database roles';
  END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA loqme_rls;
REVOKE ALL ON SCHEMA loqme_rls FROM PUBLIC;
GRANT USAGE ON SCHEMA public, loqme_rls TO loqme_app, loqme_rls_reader;
-- The NOLOGIN reader owns only fixed, read-only policy helpers, never runtime connections.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO loqme_rls_reader;

CREATE FUNCTION loqme_rls.setting(key text) RETURNS text LANGUAGE sql STABLE
SET search_path = pg_catalog AS $$ SELECT nullif(current_setting('loqme.' || key, true), '') $$;
CREATE FUNCTION loqme_rls.actor() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT id FROM public."User" WHERE id=loqme_rls.setting('user_id') AND "isActive"
$$;
CREATE FUNCTION loqme_rls.admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public."User" WHERE id=loqme_rls.actor() AND role='ADMIN')
$$;
CREATE FUNCTION loqme_rls.service(name text) RETURNS boolean LANGUAGE sql STABLE
SET search_path = pg_catalog AS $$ SELECT coalesce(loqme_rls.setting('service')=name, false) $$;
CREATE FUNCTION loqme_rls.customer(cid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public."Customer" WHERE id=cid AND "userId"=loqme_rls.actor())
$$;
CREATE FUNCTION loqme_rls.member(mid text, permission text DEFAULT 'view') RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public."Merchant" m JOIN public."User" u ON u.id=loqme_rls.actor()
    WHERE m.id=mid AND u.role IN ('MERCHANT_OWNER','MERCHANT_STAFF') AND (
      m."ownerUserId"=u.id OR EXISTS (SELECT 1 FROM public."MerchantStaff" s
        WHERE s."merchantId"=m.id AND s."userId"=u.id AND CASE permission
          WHEN 'owner' THEN s.role='OWNER'
          WHEN 'manage' THEN s.role IN ('OWNER','MANAGER')
          WHEN 'pickup' THEN s."canScanPickup"
          WHEN 'view' THEN true ELSE false END)))
$$;
CREATE FUNCTION loqme_rls.callback_order(oid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT loqme_rls.service('payment') AND EXISTS (SELECT 1 FROM public."Payment"
    WHERE "orderId"=oid AND authority=loqme_rls.setting('scope'))
$$;
CREATE FUNCTION loqme_rls.own_order(oid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public."Order" WHERE id=oid AND loqme_rls.customer("customerId"))
$$;
CREATE FUNCTION loqme_rls.order_access(oid text, permission text DEFAULT 'view') RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT loqme_rls.admin() OR loqme_rls.callback_order(oid) OR EXISTS (SELECT 1 FROM public."Order" o WHERE o.id=oid AND (
    loqme_rls.customer(o."customerId") OR loqme_rls.member(o."merchantId", CASE WHEN permission='finance' THEN 'owner' ELSE 'pickup' END)
    OR (permission='view' AND loqme_rls.member(o."merchantId",'manage'))))
$$;
CREATE FUNCTION loqme_rls.public_merchant(mid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$ SELECT EXISTS (SELECT 1 FROM public."Merchant" WHERE id=mid AND "verificationStatus"='APPROVED') $$;
CREATE FUNCTION loqme_rls.merchant_read(mid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT loqme_rls.admin() OR loqme_rls.member(mid) OR loqme_rls.public_merchant(mid)
    OR EXISTS (SELECT 1 FROM public."Order" WHERE "merchantId"=mid AND (loqme_rls.customer("customerId") OR loqme_rls.callback_order(id)))
$$;
CREATE FUNCTION loqme_rls.listing_read(lid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT loqme_rls.admin() OR EXISTS (SELECT 1 FROM public."Listing" l WHERE l.id=lid AND (
    loqme_rls.member(l."merchantId") OR (l.status IN ('PUBLISHED','SOLD_OUT') AND loqme_rls.public_merchant(l."merchantId")
      AND EXISTS (SELECT 1 FROM public."ListingSafety" s WHERE s."listingId"=l.id AND s."safetyStatus"='APPROVED'))
    OR EXISTS (SELECT 1 FROM public."Reservation" r WHERE r."listingId"=l.id AND loqme_rls.customer(r."customerId"))
    OR EXISTS (SELECT 1 FROM public."OrderItem" i WHERE i."listingId"=l.id AND loqme_rls.order_access(i."orderId"))
    OR (loqme_rls.service('expiry') AND (loqme_rls.setting('scope') IS NULL OR l.id=loqme_rls.setting('scope')))
    OR (loqme_rls.service('safety') AND l."merchantId"=loqme_rls.setting('scope'))))
$$;
CREATE FUNCTION loqme_rls.listing_manage(lid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$ SELECT loqme_rls.admin() OR EXISTS (SELECT 1 FROM public."Listing" WHERE id=lid AND loqme_rls.member("merchantId",'manage')) $$;
CREATE FUNCTION loqme_rls.stock_access(lid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$
  SELECT loqme_rls.listing_manage(lid)
    OR (loqme_rls.service('reservation') AND loqme_rls.actor() IS NOT NULL AND loqme_rls.listing_read(lid)
      AND (lid=loqme_rls.setting('scope') OR EXISTS (SELECT 1 FROM public."Reservation"
        WHERE id=loqme_rls.setting('scope') AND "listingId"=lid AND loqme_rls.customer("customerId"))))
    OR EXISTS (SELECT 1 FROM public."OrderItem" WHERE "listingId"=lid AND loqme_rls.callback_order("orderId"))
    OR (loqme_rls.service('expiry') AND (loqme_rls.setting('scope') IS NULL OR lid=loqme_rls.setting('scope')))
$$;
CREATE FUNCTION loqme_rls.auth_user(uid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$ SELECT loqme_rls.service('auth') AND EXISTS (
  SELECT 1 FROM public."User" WHERE id=uid AND mobile=loqme_rls.setting('scope')) $$;
CREATE FUNCTION loqme_rls.invited(uid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$ SELECT loqme_rls.service('invite') AND loqme_rls.member(loqme_rls.setting('scope'),'owner') AND EXISTS (
  SELECT 1 FROM public."User" WHERE id=uid AND mobile=loqme_rls.setting('subject')) $$;
CREATE FUNCTION loqme_rls.staff_identity(uid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$ SELECT EXISTS (SELECT 1 FROM public."MerchantStaff" s
  WHERE s."userId"=uid AND loqme_rls.member(s."merchantId",'manage')) $$;
CREATE FUNCTION loqme_rls.pickup_customer(cid text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog AS $$ SELECT EXISTS (SELECT 1 FROM public."Order" o WHERE o."customerId"=cid
  AND (loqme_rls.member(o."merchantId",'pickup') OR loqme_rls.member(o."merchantId",'manage') OR loqme_rls.callback_order(o.id))) $$;

-- Public review display exposes only the already-public display name and listing title.
-- It never grants public access to Customer, User, Order or OrderItem rows.
CREATE FUNCTION loqme_rls.review_details(mid text) RETURNS TABLE(id text, "fullName" text, titles jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT r.id, c."fullName", coalesce((SELECT jsonb_agg(jsonb_build_object('listing',jsonb_build_object('titleFa',coalesce(i."titleFaSnapshot",l."titleFa"))))
    FROM public."OrderItem" i JOIN public."Listing" l ON l.id=i."listingId" WHERE i."orderId"=r."orderId"),'[]'::jsonb)
  FROM public."Review" r JOIN public."Customer" c ON c.id=r."customerId"
  WHERE r."merchantId"=mid AND loqme_rls.merchant_read(mid)
$$;

DO $$ DECLARE f regprocedure; BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='loqme_rls' LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO loqme_rls_reader',f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO loqme_app',f);
  END LOOP;
END $$;

-- POLICIES (all application tables; no grants on Prisma migration metadata).

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."User" TO loqme_app;
CREATE POLICY select_access ON public."User" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (id=loqme_rls.actor() OR (loqme_rls.service('auth') AND mobile=loqme_rls.setting('scope')) OR (loqme_rls.service('invite') AND mobile=loqme_rls.setting('subject') AND loqme_rls.member(loqme_rls.setting('scope'), 'owner')) OR loqme_rls.staff_identity(id) OR EXISTS (SELECT 1 FROM public."Customer" c WHERE c."userId"="User".id AND loqme_rls.pickup_customer(c.id))));
CREATE POLICY insert_access ON public."User" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR ((loqme_rls.service('auth') AND mobile=loqme_rls.setting('scope')) OR (loqme_rls.service('invite') AND mobile=loqme_rls.setting('subject') AND loqme_rls.member(loqme_rls.setting('scope'), 'owner'))));
CREATE POLICY update_access ON public."User" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR ((loqme_rls.service('invite') AND mobile=loqme_rls.setting('subject') AND loqme_rls.member(loqme_rls.setting('scope'), 'owner')))) WITH CHECK ((loqme_rls.admin()) OR ((loqme_rls.service('invite') AND mobile=loqme_rls.setting('subject') AND loqme_rls.member(loqme_rls.setting('scope'), 'owner'))));
CREATE POLICY delete_access ON public."User" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Customer" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Customer" TO loqme_app;
CREATE POLICY select_access ON public."Customer" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR ("userId"=loqme_rls.actor() OR loqme_rls.auth_user("userId") OR loqme_rls.invited("userId") OR loqme_rls.staff_identity("userId") OR loqme_rls.pickup_customer(id)));
CREATE POLICY insert_access ON public."Customer" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR ("userId"=loqme_rls.actor() OR loqme_rls.auth_user("userId") OR loqme_rls.invited("userId")));
CREATE POLICY update_access ON public."Customer" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR ("userId"=loqme_rls.actor() OR (loqme_rls.service('payment') AND loqme_rls.pickup_customer(id)))) WITH CHECK ((loqme_rls.admin()) OR ("userId"=loqme_rls.actor() OR (loqme_rls.service('payment') AND loqme_rls.pickup_customer(id))));
CREATE POLICY delete_access ON public."Customer" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Merchant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Merchant" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Merchant" TO loqme_app;
CREATE POLICY select_access ON public."Merchant" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.merchant_read(id)));
CREATE POLICY insert_access ON public."Merchant" FOR INSERT TO loqme_app WITH CHECK (loqme_rls.admin());
CREATE POLICY update_access ON public."Merchant" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member(id, 'owner') OR (loqme_rls.service('review') AND id=loqme_rls.setting('scope')))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.member(id, 'owner') OR (loqme_rls.service('review') AND id=loqme_rls.setting('scope'))));
CREATE POLICY delete_access ON public."Merchant" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."MerchantStaff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MerchantStaff" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."MerchantStaff" TO loqme_app;
CREATE POLICY select_access ON public."MerchantStaff" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'view')));
CREATE POLICY insert_access ON public."MerchantStaff" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner')));
CREATE POLICY update_access ON public."MerchantStaff" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner'))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner')));
CREATE POLICY delete_access ON public."MerchantStaff" FOR DELETE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner')));

ALTER TABLE public."MerchantApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MerchantApplication" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."MerchantApplication" TO loqme_app;
CREATE POLICY select_access ON public."MerchantApplication" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR ("applicantId"=loqme_rls.actor()));
CREATE POLICY insert_access ON public."MerchantApplication" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR ("applicantId"=loqme_rls.actor()));
CREATE POLICY update_access ON public."MerchantApplication" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR ("applicantId"=loqme_rls.actor())) WITH CHECK ((loqme_rls.admin()) OR ("applicantId"=loqme_rls.actor()));
CREATE POLICY delete_access ON public."MerchantApplication" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Province" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Province" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Province" TO loqme_app;
CREATE POLICY select_access ON public."Province" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (true));
CREATE POLICY insert_access ON public."Province" FOR INSERT TO loqme_app WITH CHECK (loqme_rls.admin());
CREATE POLICY update_access ON public."Province" FOR UPDATE TO loqme_app USING (loqme_rls.admin()) WITH CHECK (loqme_rls.admin());
CREATE POLICY delete_access ON public."Province" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."City" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."City" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."City" TO loqme_app;
CREATE POLICY select_access ON public."City" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (true));
CREATE POLICY insert_access ON public."City" FOR INSERT TO loqme_app WITH CHECK (loqme_rls.admin());
CREATE POLICY update_access ON public."City" FOR UPDATE TO loqme_app USING (loqme_rls.admin()) WITH CHECK (loqme_rls.admin());
CREATE POLICY delete_access ON public."City" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Neighborhood" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Neighborhood" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Neighborhood" TO loqme_app;
CREATE POLICY select_access ON public."Neighborhood" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (true));
CREATE POLICY insert_access ON public."Neighborhood" FOR INSERT TO loqme_app WITH CHECK (loqme_rls.admin());
CREATE POLICY update_access ON public."Neighborhood" FOR UPDATE TO loqme_app USING (loqme_rls.admin()) WITH CHECK (loqme_rls.admin());
CREATE POLICY delete_access ON public."Neighborhood" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Category" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Category" TO loqme_app;
CREATE POLICY select_access ON public."Category" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (true));
CREATE POLICY insert_access ON public."Category" FOR INSERT TO loqme_app WITH CHECK (loqme_rls.admin());
CREATE POLICY update_access ON public."Category" FOR UPDATE TO loqme_app USING (loqme_rls.admin()) WITH CHECK (loqme_rls.admin());
CREATE POLICY delete_access ON public."Category" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."MerchantLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MerchantLocation" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."MerchantLocation" TO loqme_app;
CREATE POLICY select_access ON public."MerchantLocation" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.merchant_read("merchantId")));
CREATE POLICY insert_access ON public."MerchantLocation" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner')));
CREATE POLICY update_access ON public."MerchantLocation" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner'))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner')));
CREATE POLICY delete_access ON public."MerchantLocation" FOR DELETE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner')));

ALTER TABLE public."MerchantHours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MerchantHours" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."MerchantHours" TO loqme_app;
CREATE POLICY select_access ON public."MerchantHours" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (EXISTS (SELECT 1 FROM public."MerchantLocation" l WHERE l.id="merchantLocationId" AND loqme_rls.merchant_read(l."merchantId"))));
CREATE POLICY insert_access ON public."MerchantHours" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (EXISTS (SELECT 1 FROM public."MerchantLocation" l WHERE l.id="merchantLocationId" AND loqme_rls.member(l."merchantId",'owner'))));
CREATE POLICY update_access ON public."MerchantHours" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (EXISTS (SELECT 1 FROM public."MerchantLocation" l WHERE l.id="merchantLocationId" AND loqme_rls.member(l."merchantId",'owner')))) WITH CHECK ((loqme_rls.admin()) OR (EXISTS (SELECT 1 FROM public."MerchantLocation" l WHERE l.id="merchantLocationId" AND loqme_rls.member(l."merchantId",'owner'))));
CREATE POLICY delete_access ON public."MerchantHours" FOR DELETE TO loqme_app USING ((loqme_rls.admin()) OR (EXISTS (SELECT 1 FROM public."MerchantLocation" l WHERE l.id="merchantLocationId" AND loqme_rls.member(l."merchantId",'owner'))));

ALTER TABLE public."Listing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Listing" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Listing" TO loqme_app;
CREATE POLICY select_access ON public."Listing" FOR SELECT TO loqme_app USING (loqme_rls.admin() OR loqme_rls.member("merchantId") OR loqme_rls.listing_read(id));
CREATE POLICY insert_access ON public."Listing" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'manage')));
CREATE POLICY update_access ON public."Listing" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.stock_access(id) OR (loqme_rls.service('safety') AND "merchantId"=loqme_rls.setting('scope')))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.stock_access(id) OR (loqme_rls.service('safety') AND "merchantId"=loqme_rls.setting('scope'))));
CREATE POLICY delete_access ON public."Listing" FOR DELETE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'manage')));

ALTER TABLE public."ListingImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ListingImage" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ListingImage" TO loqme_app;
CREATE POLICY select_access ON public."ListingImage" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.listing_read("listingId")));
CREATE POLICY insert_access ON public."ListingImage" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId")));
CREATE POLICY update_access ON public."ListingImage" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId"))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId")));
CREATE POLICY delete_access ON public."ListingImage" FOR DELETE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId")));

ALTER TABLE public."ListingInventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ListingInventory" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ListingInventory" TO loqme_app;
CREATE POLICY select_access ON public."ListingInventory" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.listing_read("listingId")));
CREATE POLICY insert_access ON public."ListingInventory" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId")));
CREATE POLICY update_access ON public."ListingInventory" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.stock_access("listingId"))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.stock_access("listingId")));
CREATE POLICY delete_access ON public."ListingInventory" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."ListingSafety" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ListingSafety" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ListingSafety" TO loqme_app;
CREATE POLICY select_access ON public."ListingSafety" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.listing_read("listingId")));
CREATE POLICY insert_access ON public."ListingSafety" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId")));
CREATE POLICY update_access ON public."ListingSafety" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId") OR (loqme_rls.service('safety') AND EXISTS (SELECT 1 FROM public."Listing" l WHERE l.id="listingId" AND l."merchantId"=loqme_rls.setting('scope'))))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId") OR (loqme_rls.service('safety') AND EXISTS (SELECT 1 FROM public."Listing" l WHERE l.id="listingId" AND l."merchantId"=loqme_rls.setting('scope')))));
CREATE POLICY delete_access ON public."ListingSafety" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."ListingAttributes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ListingAttributes" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ListingAttributes" TO loqme_app;
CREATE POLICY select_access ON public."ListingAttributes" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.listing_read("listingId")));
CREATE POLICY insert_access ON public."ListingAttributes" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId")));
CREATE POLICY update_access ON public."ListingAttributes" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId"))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId")));
CREATE POLICY delete_access ON public."ListingAttributes" FOR DELETE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.listing_manage("listingId")));

ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Session" TO loqme_app;
CREATE POLICY select_access ON public."Session" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR ("userId"=loqme_rls.actor() OR loqme_rls.auth_user("userId")));
CREATE POLICY insert_access ON public."Session" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.auth_user("userId")));
CREATE POLICY update_access ON public."Session" FOR UPDATE TO loqme_app USING (loqme_rls.admin()) WITH CHECK (loqme_rls.admin());
CREATE POLICY delete_access ON public."Session" FOR DELETE TO loqme_app USING ((loqme_rls.admin()) OR ("userId"=loqme_rls.actor()));

ALTER TABLE public."OtpCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OtpCode" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."OtpCode" TO loqme_app;
CREATE POLICY select_access ON public."OtpCode" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.service('auth') AND mobile=loqme_rls.setting('scope')));
CREATE POLICY insert_access ON public."OtpCode" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.service('auth') AND mobile=loqme_rls.setting('scope')));
CREATE POLICY update_access ON public."OtpCode" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.service('auth') AND mobile=loqme_rls.setting('scope'))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.service('auth') AND mobile=loqme_rls.setting('scope')));
CREATE POLICY delete_access ON public."OtpCode" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Favorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Favorite" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Favorite" TO loqme_app;
CREATE POLICY select_access ON public."Favorite" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.customer("customerId")));
CREATE POLICY insert_access ON public."Favorite" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.customer("customerId")));
CREATE POLICY update_access ON public."Favorite" FOR UPDATE TO loqme_app USING (loqme_rls.admin()) WITH CHECK (loqme_rls.admin());
CREATE POLICY delete_access ON public."Favorite" FOR DELETE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.customer("customerId")));

ALTER TABLE public."Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reservation" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Reservation" TO loqme_app;
CREATE POLICY select_access ON public."Reservation" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.customer("customerId") OR (EXISTS (SELECT 1 FROM public."Order" o WHERE o."reservationId"="Reservation".id AND loqme_rls.callback_order(o.id))) OR (loqme_rls.service('expiry') AND (loqme_rls.setting('scope') IS NULL OR "listingId"=loqme_rls.setting('scope'))) OR EXISTS (SELECT 1 FROM public."Listing" l WHERE l.id="listingId" AND loqme_rls.member(l."merchantId",'manage'))));
CREATE POLICY insert_access ON public."Reservation" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.customer("customerId")));
CREATE POLICY update_access ON public."Reservation" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.customer("customerId") OR (EXISTS (SELECT 1 FROM public."Order" o WHERE o."reservationId"="Reservation".id AND loqme_rls.callback_order(o.id))) OR (loqme_rls.service('expiry') AND (loqme_rls.setting('scope') IS NULL OR "listingId"=loqme_rls.setting('scope'))))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.customer("customerId") OR (EXISTS (SELECT 1 FROM public."Order" o WHERE o."reservationId"="Reservation".id AND loqme_rls.callback_order(o.id))) OR (loqme_rls.service('expiry') AND (loqme_rls.setting('scope') IS NULL OR "listingId"=loqme_rls.setting('scope')))));
CREATE POLICY delete_access ON public."Reservation" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Order" TO loqme_app;
CREATE POLICY select_access ON public."Order" FOR SELECT TO loqme_app USING (loqme_rls.admin() OR loqme_rls.customer("customerId") OR loqme_rls.member("merchantId",'pickup') OR loqme_rls.member("merchantId",'manage') OR loqme_rls.callback_order(id));
CREATE POLICY insert_access ON public."Order" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.customer("customerId")));
CREATE POLICY update_access ON public."Order" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.order_access(id))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.order_access(id)));
CREATE POLICY delete_access ON public."Order" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderItem" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."OrderItem" TO loqme_app;
CREATE POLICY select_access ON public."OrderItem" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.order_access("orderId")));
CREATE POLICY insert_access ON public."OrderItem" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.own_order("orderId")));
CREATE POLICY update_access ON public."OrderItem" FOR UPDATE TO loqme_app USING (loqme_rls.admin()) WITH CHECK (loqme_rls.admin());
CREATE POLICY delete_access ON public."OrderItem" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Payment" TO loqme_app;
CREATE POLICY select_access ON public."Payment" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.order_access("orderId",'finance')));
CREATE POLICY insert_access ON public."Payment" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.own_order("orderId")));
CREATE POLICY update_access ON public."Payment" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.callback_order("orderId"))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.callback_order("orderId")));
CREATE POLICY delete_access ON public."Payment" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."PaymentAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentAttempt" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."PaymentAttempt" TO loqme_app;
CREATE POLICY select_access ON public."PaymentAttempt" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.order_access("orderId",'finance')));
CREATE POLICY insert_access ON public."PaymentAttempt" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.own_order("orderId")));
CREATE POLICY update_access ON public."PaymentAttempt" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.own_order("orderId"))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.own_order("orderId")));
CREATE POLICY delete_access ON public."PaymentAttempt" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."PaymentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentEvent" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."PaymentEvent" TO loqme_app;
CREATE POLICY select_access ON public."PaymentEvent" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (EXISTS (SELECT 1 FROM public."Payment" p WHERE p.id="paymentId" AND loqme_rls.order_access(p."orderId",'finance'))));
CREATE POLICY insert_access ON public."PaymentEvent" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (EXISTS (SELECT 1 FROM public."Payment" p WHERE p.id="paymentId" AND (loqme_rls.own_order(p."orderId") OR loqme_rls.callback_order(p."orderId")))));

ALTER TABLE public."FinancialTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FinancialTransaction" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."FinancialTransaction" TO loqme_app;
CREATE POLICY select_access ON public."FinancialTransaction" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.order_access("orderId",'finance')));
CREATE POLICY insert_access ON public."FinancialTransaction" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.callback_order("orderId")));

ALTER TABLE public."Refund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Refund" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Refund" TO loqme_app;
CREATE POLICY select_access ON public."Refund" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.order_access("orderId",'finance')));
CREATE POLICY insert_access ON public."Refund" FOR INSERT TO loqme_app WITH CHECK (loqme_rls.admin());
CREATE POLICY update_access ON public."Refund" FOR UPDATE TO loqme_app USING (loqme_rls.admin()) WITH CHECK (loqme_rls.admin());
CREATE POLICY delete_access ON public."Refund" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."PickupVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PickupVerification" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."PickupVerification" TO loqme_app;
CREATE POLICY select_access ON public."PickupVerification" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.order_access("orderId")));
CREATE POLICY insert_access ON public."PickupVerification" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.order_access("orderId")));
CREATE POLICY update_access ON public."PickupVerification" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id="orderId" AND loqme_rls.member(o."merchantId",'pickup')))) WITH CHECK ((loqme_rls.admin()) OR (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id="orderId" AND loqme_rls.member(o."merchantId",'pickup'))));
CREATE POLICY delete_access ON public."PickupVerification" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Review" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Review" TO loqme_app;
CREATE POLICY select_access ON public."Review" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.merchant_read("merchantId")));
CREATE POLICY insert_access ON public."Review" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.customer("customerId") AND EXISTS (SELECT 1 FROM public."Order" o WHERE o.id="orderId" AND o."customerId"="Review"."customerId" AND o."merchantId"="Review"."merchantId" AND o.status='COMPLETED')));
CREATE POLICY update_access ON public."Review" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'view'))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'view')));
CREATE POLICY delete_access ON public."Review" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."Complaint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Complaint" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Complaint" TO loqme_app;
CREATE POLICY select_access ON public."Complaint" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.customer("customerId") OR (loqme_rls.service('safety') AND "merchantId"=loqme_rls.setting('scope'))));
CREATE POLICY insert_access ON public."Complaint" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.customer("customerId") AND EXISTS (SELECT 1 FROM public."Order" o WHERE o.id="orderId" AND o."customerId"="Complaint"."customerId" AND o."merchantId"="Complaint"."merchantId")));
CREATE POLICY update_access ON public."Complaint" FOR UPDATE TO loqme_app USING (loqme_rls.admin()) WITH CHECK (loqme_rls.admin());
CREATE POLICY delete_access ON public."Complaint" FOR DELETE TO loqme_app USING (loqme_rls.admin());

ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."AuditLog" TO loqme_app;
CREATE POLICY select_access ON public."AuditLog" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR ("actorId"=loqme_rls.actor()));
CREATE POLICY insert_access ON public."AuditLog" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.actor() IS NOT NULL OR loqme_rls.service('payment') OR loqme_rls.service('safety')));

ALTER TABLE public."ListingRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ListingRevision" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ListingRevision" TO loqme_app;
CREATE POLICY select_access ON public."ListingRevision" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner')));
CREATE POLICY insert_access ON public."ListingRevision" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (pg_trigger_depth()>0));

ALTER TABLE public."ListingInventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ListingInventoryMovement" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ListingInventoryMovement" TO loqme_app;
CREATE POLICY select_access ON public."ListingInventoryMovement" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.member("merchantId", 'owner')));
CREATE POLICY insert_access ON public."ListingInventoryMovement" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (pg_trigger_depth()>0));

ALTER TABLE public."ReconciliationCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReconciliationCase" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ReconciliationCase" TO loqme_app;
CREATE POLICY select_access ON public."ReconciliationCase" FOR SELECT TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.callback_order("orderId") OR loqme_rls.own_order("orderId") OR loqme_rls.member("merchantId",'owner')));
CREATE POLICY insert_access ON public."ReconciliationCase" FOR INSERT TO loqme_app WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.callback_order("orderId") OR loqme_rls.own_order("orderId")));
CREATE POLICY update_access ON public."ReconciliationCase" FOR UPDATE TO loqme_app USING ((loqme_rls.admin()) OR (loqme_rls.callback_order("orderId") OR loqme_rls.own_order("orderId"))) WITH CHECK ((loqme_rls.admin()) OR (loqme_rls.callback_order("orderId") OR loqme_rls.own_order("orderId")));
CREATE POLICY delete_access ON public."ReconciliationCase" FOR DELETE TO loqme_app USING (loqme_rls.admin());

-- RLS is row isolation. These guards additionally prevent writable rows from being
-- used to promote roles, move ownership, approve applications or forge payment state.
CREATE FUNCTION loqme_rls.guard_write() RETURNS trigger LANGUAGE plpgsql
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
REVOKE ALL ON FUNCTION loqme_rls.guard_write() FROM PUBLIC;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['User','Customer','Merchant','MerchantStaff','MerchantApplication','MerchantLocation','MerchantHours',
    'Listing','ListingInventory','ListingSafety','Reservation','Order','Payment','PaymentAttempt','PickupVerification','Review','Complaint','AuditLog','ReconciliationCase'] LOOP
    EXECUTE format('CREATE TRIGGER rls_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION loqme_rls.guard_write()',t);
  END LOOP;
END $$;
-- Existing integrity triggers must inspect financial facts hidden from cashiers.
-- These read-only trigger functions cannot be called as ordinary SQL functions.
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['loqme_order_allocation','loqme_order_pickup_immutable','loqme_payment_fact_immutable','loqme_refund_identity'] LOOP
    EXECUTE format('ALTER FUNCTION public.%I() SECURITY DEFINER',f);
    EXECUTE format('ALTER FUNCTION public.%I() SET search_path = pg_catalog, public, pg_temp',f);
    EXECUTE format('ALTER FUNCTION public.%I() OWNER TO loqme_rls_reader',f);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM PUBLIC',f);
  END LOOP;
END $$;
COMMIT;
