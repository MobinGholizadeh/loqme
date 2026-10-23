-- CreateEnum
CREATE TYPE "BankAccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "MerchantBankAccount" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "shabaNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT,
    "accountHolder" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "BankAccountStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantPayoutRequest" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amountToman" BIGINT NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "trackingReference" TEXT,
    "rejectionReason" TEXT,
    "notesFa" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantPayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantBankAccount_merchantId_idx" ON "MerchantBankAccount"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantBankAccount_status_idx" ON "MerchantBankAccount"("status");

-- CreateIndex
CREATE INDEX "MerchantBankAccount_shabaNumber_idx" ON "MerchantBankAccount"("shabaNumber");

-- CreateIndex
CREATE INDEX "MerchantPayoutRequest_merchantId_idx" ON "MerchantPayoutRequest"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantPayoutRequest_status_idx" ON "MerchantPayoutRequest"("status");

-- CreateIndex
CREATE INDEX "MerchantPayoutRequest_bankAccountId_idx" ON "MerchantPayoutRequest"("bankAccountId");

-- CreateIndex
CREATE INDEX "MerchantPayoutRequest_createdAt_idx" ON "MerchantPayoutRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "MerchantBankAccount" ADD CONSTRAINT "MerchantBankAccount_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantBankAccount" ADD CONSTRAINT "MerchantBankAccount_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPayoutRequest" ADD CONSTRAINT "MerchantPayoutRequest_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPayoutRequest" ADD CONSTRAINT "MerchantPayoutRequest_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "MerchantBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPayoutRequest" ADD CONSTRAINT "MerchantPayoutRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPayoutRequest" ADD CONSTRAINT "MerchantPayoutRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Row Level Security (RLS) Policies & Grants
ALTER TABLE public."MerchantBankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MerchantBankAccount" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."MerchantBankAccount" TO loqme_app;
GRANT SELECT ON public."MerchantBankAccount" TO loqme_rls_reader;

CREATE POLICY select_access ON public."MerchantBankAccount" FOR SELECT TO loqme_app
  USING (loqme_rls.admin() OR loqme_rls.member("merchantId", 'owner'));

CREATE POLICY insert_access ON public."MerchantBankAccount" FOR INSERT TO loqme_app
  WITH CHECK (loqme_rls.admin() OR loqme_rls.member("merchantId", 'owner'));

CREATE POLICY update_access ON public."MerchantBankAccount" FOR UPDATE TO loqme_app
  USING (loqme_rls.admin() OR loqme_rls.member("merchantId", 'owner'))
  WITH CHECK (loqme_rls.admin() OR loqme_rls.member("merchantId", 'owner'));

CREATE POLICY delete_access ON public."MerchantBankAccount" FOR DELETE TO loqme_app
  USING (loqme_rls.admin() OR loqme_rls.member("merchantId", 'owner'));

ALTER TABLE public."MerchantPayoutRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MerchantPayoutRequest" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."MerchantPayoutRequest" TO loqme_app;
GRANT SELECT ON public."MerchantPayoutRequest" TO loqme_rls_reader;

CREATE POLICY select_access ON public."MerchantPayoutRequest" FOR SELECT TO loqme_app
  USING (loqme_rls.admin() OR loqme_rls.member("merchantId", 'owner'));

CREATE POLICY insert_access ON public."MerchantPayoutRequest" FOR INSERT TO loqme_app
  WITH CHECK (loqme_rls.admin() OR loqme_rls.member("merchantId", 'owner'));

CREATE POLICY update_access ON public."MerchantPayoutRequest" FOR UPDATE TO loqme_app
  USING (loqme_rls.admin() OR loqme_rls.member("merchantId", 'owner'))
  WITH CHECK (loqme_rls.admin() OR loqme_rls.member("merchantId", 'owner'));

CREATE POLICY delete_access ON public."MerchantPayoutRequest" FOR DELETE TO loqme_app
  USING (loqme_rls.admin());
