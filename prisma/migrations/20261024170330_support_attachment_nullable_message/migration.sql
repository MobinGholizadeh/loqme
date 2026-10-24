-- AlterTable
ALTER TABLE "SupportAttachment" ADD COLUMN "uploadedByUserId" TEXT,
ALTER COLUMN "messageId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "SupportAttachment_uploadedByUserId_idx" ON "SupportAttachment"("uploadedByUserId");

-- Update RLS policies on SupportAttachment to support pre-message attachment uploads
DROP POLICY IF EXISTS select_access ON public."SupportAttachment";
DROP POLICY IF EXISTS insert_access ON public."SupportAttachment";
DROP POLICY IF EXISTS update_access ON public."SupportAttachment";

CREATE POLICY select_access ON public."SupportAttachment" FOR SELECT TO loqme_app
  USING (
    loqme_rls.admin()
    OR ("uploadedByUserId" IS NOT NULL AND "uploadedByUserId" = loqme_rls.actor())
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
    OR ("uploadedByUserId" IS NOT NULL AND "uploadedByUserId" = loqme_rls.actor())
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
  USING (
    loqme_rls.admin()
    OR ("uploadedByUserId" IS NOT NULL AND "uploadedByUserId" = loqme_rls.actor())
  )
  WITH CHECK (
    loqme_rls.admin()
    OR ("uploadedByUserId" IS NOT NULL AND "uploadedByUserId" = loqme_rls.actor())
  );
