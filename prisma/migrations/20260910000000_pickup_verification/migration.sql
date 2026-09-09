-- CreateTable: PickupVerification
CREATE TABLE "PickupVerification" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "qrCodeHash" TEXT,
    "otpCode" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verifiedByStaffId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PickupVerification_orderId_key" ON "PickupVerification"("orderId");

-- CreateIndex
CREATE INDEX "PickupVerification_otpCode_isVerified_idx" ON "PickupVerification"("otpCode", "isVerified");

-- CreateIndex
CREATE INDEX "PickupVerification_orderId_idx" ON "PickupVerification"("orderId");

-- CreateIndex
CREATE INDEX "PickupVerification_isVerified_idx" ON "PickupVerification"("isVerified");

-- CreateIndex
CREATE INDEX "Order_merchantId_status_idx" ON "Order"("merchantId", "status");

-- AddForeignKey
ALTER TABLE "PickupVerification" ADD CONSTRAINT "PickupVerification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupVerification" ADD CONSTRAINT "PickupVerification_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupVerification" ADD CONSTRAINT "PickupVerification_verifiedByStaffId_fkey" FOREIGN KEY ("verifiedByStaffId") REFERENCES "MerchantStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
