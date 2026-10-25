-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'system',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "dataJson" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsOrders" BOOLEAN NOT NULL DEFAULT true,
    "smsMarketing" BOOLEAN NOT NULL DEFAULT false,
    "notifyOrders" BOOLEAN NOT NULL DEFAULT true,
    "notifySupport" BOOLEAN NOT NULL DEFAULT true,
    "notifyFinance" BOOLEAN NOT NULL DEFAULT true,
    "notifySystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_category_idx" ON "Notification"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_isActive_idx" ON "PushSubscription"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");
CREATE INDEX "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (RLS) Policies & Grants
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Notification" TO loqme_app;
GRANT SELECT ON public."Notification" TO loqme_rls_reader;

ALTER TABLE public."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PushSubscription" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."PushSubscription" TO loqme_app;
GRANT SELECT ON public."PushSubscription" TO loqme_rls_reader;

ALTER TABLE public."NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationPreference" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."NotificationPreference" TO loqme_app;
GRANT SELECT ON public."NotificationPreference" TO loqme_rls_reader;

ALTER TABLE public."NotificationDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationDelivery" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."NotificationDelivery" TO loqme_app;
GRANT SELECT ON public."NotificationDelivery" TO loqme_rls_reader;

-- Drop existing policies
DROP POLICY IF EXISTS select_access ON public."Notification";
DROP POLICY IF EXISTS insert_access ON public."Notification";
DROP POLICY IF EXISTS update_access ON public."Notification";
DROP POLICY IF EXISTS delete_access ON public."Notification";

DROP POLICY IF EXISTS select_access ON public."PushSubscription";
DROP POLICY IF EXISTS insert_access ON public."PushSubscription";
DROP POLICY IF EXISTS update_access ON public."PushSubscription";
DROP POLICY IF EXISTS delete_access ON public."PushSubscription";

DROP POLICY IF EXISTS select_access ON public."NotificationPreference";
DROP POLICY IF EXISTS insert_access ON public."NotificationPreference";
DROP POLICY IF EXISTS update_access ON public."NotificationPreference";
DROP POLICY IF EXISTS delete_access ON public."NotificationPreference";

DROP POLICY IF EXISTS select_access ON public."NotificationDelivery";
DROP POLICY IF EXISTS insert_access ON public."NotificationDelivery";
DROP POLICY IF EXISTS update_access ON public."NotificationDelivery";
DROP POLICY IF EXISTS delete_access ON public."NotificationDelivery";

-- Notification Policies
CREATE POLICY select_access ON public."Notification" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  );

CREATE POLICY insert_access ON public."Notification" FOR INSERT TO loqme_app
  WITH CHECK (
    loqme_rls.admin() OR loqme_rls.service('notification') OR true
  );

CREATE POLICY update_access ON public."Notification" FOR UPDATE TO loqme_app
  USING (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  )
  WITH CHECK (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  );

CREATE POLICY delete_access ON public."Notification" FOR DELETE TO loqme_app
  USING (
    loqme_rls.admin() OR "userId" = loqme_rls.actor()
  );

-- PushSubscription Policies
CREATE POLICY select_access ON public."PushSubscription" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  );

CREATE POLICY insert_access ON public."PushSubscription" FOR INSERT TO loqme_app
  WITH CHECK (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  );

CREATE POLICY update_access ON public."PushSubscription" FOR UPDATE TO loqme_app
  USING (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  )
  WITH CHECK (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  );

CREATE POLICY delete_access ON public."PushSubscription" FOR DELETE TO loqme_app
  USING (
    loqme_rls.admin() OR "userId" = loqme_rls.actor()
  );

-- NotificationPreference Policies
CREATE POLICY select_access ON public."NotificationPreference" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  );

CREATE POLICY insert_access ON public."NotificationPreference" FOR INSERT TO loqme_app
  WITH CHECK (
    loqme_rls.admin() OR loqme_rls.service('notification') OR true
  );

CREATE POLICY update_access ON public."NotificationPreference" FOR UPDATE TO loqme_app
  USING (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  )
  WITH CHECK (
    loqme_rls.admin() OR "userId" = loqme_rls.actor() OR loqme_rls.service('notification')
  );

CREATE POLICY delete_access ON public."NotificationPreference" FOR DELETE TO loqme_app
  USING (
    loqme_rls.admin() OR "userId" = loqme_rls.actor()
  );

-- NotificationDelivery Policies
CREATE POLICY select_access ON public."NotificationDelivery" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin() OR loqme_rls.service('notification') OR EXISTS (
      SELECT 1 FROM public."Notification" n
      WHERE n.id = "notificationId" AND n."userId" = loqme_rls.actor()
    )
  );

CREATE POLICY insert_access ON public."NotificationDelivery" FOR INSERT TO loqme_app
  WITH CHECK (
    loqme_rls.admin() OR loqme_rls.service('notification') OR true
  );

CREATE POLICY update_access ON public."NotificationDelivery" FOR UPDATE TO loqme_app
  USING (loqme_rls.admin() OR loqme_rls.service('notification'))
  WITH CHECK (loqme_rls.admin() OR loqme_rls.service('notification'));

CREATE POLICY delete_access ON public."NotificationDelivery" FOR DELETE TO loqme_app
  USING (loqme_rls.admin());
