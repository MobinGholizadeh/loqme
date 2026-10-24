-- CreateEnum
CREATE TYPE "SupportChannelType" AS ENUM ('CUSTOMER_ADMIN', 'MERCHANT_ADMIN');

-- CreateEnum
CREATE TYPE "SupportConversationStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportMessageSenderType" AS ENUM ('ADMIN', 'MERCHANT', 'CUSTOMER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SupportAttachmentType" AS ENUM ('IMAGE', 'DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "SupportConversation" (
    "id" TEXT NOT NULL,
    "channelType" "SupportChannelType" NOT NULL DEFAULT 'CUSTOMER_ADMIN',
    "userId" TEXT,
    "merchantId" TEXT,
    "subject" TEXT,
    "status" "SupportConversationStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "unreadCustomerCount" INTEGER NOT NULL DEFAULT 0,
    "unreadMerchantCount" INTEGER NOT NULL DEFAULT 0,
    "unreadAdminCount" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderType" "SupportMessageSenderType" NOT NULL,
    "clientMessageId" TEXT,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "readByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "attachmentType" "SupportAttachmentType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportConversation_channelType_status_idx" ON "SupportConversation"("channelType", "status");

-- CreateIndex
CREATE INDEX "SupportConversation_userId_idx" ON "SupportConversation"("userId");

-- CreateIndex
CREATE INDEX "SupportConversation_merchantId_idx" ON "SupportConversation"("merchantId");

-- CreateIndex
CREATE INDEX "SupportConversation_lastMessageAt_idx" ON "SupportConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "SupportConversation_status_updatedAt_idx" ON "SupportConversation"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_conversationId_isRead_idx" ON "SupportMessage"("conversationId", "isRead");

-- CreateIndex
CREATE INDEX "SupportMessage_clientMessageId_idx" ON "SupportMessage"("clientMessageId");

-- CreateIndex
CREATE INDEX "SupportAttachment_messageId_idx" ON "SupportAttachment"("messageId");

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (RLS) Policies & Grants
ALTER TABLE public."SupportConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportConversation" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."SupportConversation" TO loqme_app;
GRANT SELECT ON public."SupportConversation" TO loqme_rls_reader;

CREATE POLICY select_access ON public."SupportConversation" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin()
    OR ("channelType" = 'CUSTOMER_ADMIN' AND "userId" = loqme_rls.actor())
    OR ("channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member("merchantId", 'manage'))
  );

CREATE POLICY insert_access ON public."SupportConversation" FOR INSERT TO loqme_app
  WITH CHECK (
    loqme_rls.admin()
    OR ("channelType" = 'CUSTOMER_ADMIN' AND "userId" = loqme_rls.actor())
    OR ("channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member("merchantId", 'manage'))
  );

CREATE POLICY update_access ON public."SupportConversation" FOR UPDATE TO loqme_app
  USING (
    loqme_rls.admin()
    OR ("channelType" = 'CUSTOMER_ADMIN' AND "userId" = loqme_rls.actor())
    OR ("channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member("merchantId", 'manage'))
  )
  WITH CHECK (
    loqme_rls.admin()
    OR ("channelType" = 'CUSTOMER_ADMIN' AND "userId" = loqme_rls.actor())
    OR ("channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member("merchantId", 'manage'))
  );

CREATE POLICY delete_access ON public."SupportConversation" FOR DELETE TO loqme_app
  USING (loqme_rls.admin());

ALTER TABLE public."SupportMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportMessage" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."SupportMessage" TO loqme_app;
GRANT SELECT ON public."SupportMessage" TO loqme_rls_reader;

CREATE POLICY select_access ON public."SupportMessage" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin()
    OR EXISTS (
      SELECT 1 FROM public."SupportConversation" c
      WHERE c.id = "conversationId"
        AND (
          (c."channelType" = 'CUSTOMER_ADMIN' AND c."userId" = loqme_rls.actor())
          OR (c."channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member(c."merchantId", 'manage'))
        )
    )
  );

CREATE POLICY insert_access ON public."SupportMessage" FOR INSERT TO loqme_app
  WITH CHECK (
    (
      loqme_rls.admin()
      OR EXISTS (
        SELECT 1 FROM public."SupportConversation" c
        WHERE c.id = "conversationId"
          AND (
            (c."channelType" = 'CUSTOMER_ADMIN' AND c."userId" = loqme_rls.actor())
            OR (c."channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member(c."merchantId", 'manage'))
          )
      )
    )
    AND "senderUserId" = loqme_rls.actor()
  );

CREATE POLICY update_access ON public."SupportMessage" FOR UPDATE TO loqme_app
  USING (
    loqme_rls.admin()
    OR EXISTS (
      SELECT 1 FROM public."SupportConversation" c
      WHERE c.id = "conversationId"
        AND (
          (c."channelType" = 'CUSTOMER_ADMIN' AND c."userId" = loqme_rls.actor())
          OR (c."channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member(c."merchantId", 'manage'))
        )
    )
  )
  WITH CHECK (
    loqme_rls.admin()
    OR EXISTS (
      SELECT 1 FROM public."SupportConversation" c
      WHERE c.id = "conversationId"
        AND (
          (c."channelType" = 'CUSTOMER_ADMIN' AND c."userId" = loqme_rls.actor())
          OR (c."channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member(c."merchantId", 'manage'))
        )
    )
  );

CREATE POLICY delete_access ON public."SupportMessage" FOR DELETE TO loqme_app
  USING (loqme_rls.admin());

ALTER TABLE public."SupportAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportAttachment" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."SupportAttachment" TO loqme_app;
GRANT SELECT ON public."SupportAttachment" TO loqme_rls_reader;

CREATE POLICY select_access ON public."SupportAttachment" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin()
    OR EXISTS (
      SELECT 1 FROM public."SupportMessage" m
      JOIN public."SupportConversation" c ON c.id = m."conversationId"
      WHERE m.id = "messageId"
        AND (
          (c."channelType" = 'CUSTOMER_ADMIN' AND c."userId" = loqme_rls.actor())
          OR (c."channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member(c."merchantId", 'manage'))
        )
    )
  );

CREATE POLICY insert_access ON public."SupportAttachment" FOR INSERT TO loqme_app
  WITH CHECK (
    loqme_rls.admin()
    OR EXISTS (
      SELECT 1 FROM public."SupportMessage" m
      JOIN public."SupportConversation" c ON c.id = m."conversationId"
      WHERE m.id = "messageId"
        AND (
          (c."channelType" = 'CUSTOMER_ADMIN' AND c."userId" = loqme_rls.actor())
          OR (c."channelType" = 'MERCHANT_ADMIN' AND loqme_rls.member(c."merchantId", 'manage'))
        )
    )
  );

CREATE POLICY update_access ON public."SupportAttachment" FOR UPDATE TO loqme_app
  USING (loqme_rls.admin())
  WITH CHECK (loqme_rls.admin());

CREATE POLICY delete_access ON public."SupportAttachment" FOR DELETE TO loqme_app
  USING (loqme_rls.admin());
