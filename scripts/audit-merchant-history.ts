/** Read-only preflight. Set DATABASE_URL explicitly for the approved target. */
import { prisma } from '../apps/web/src/lib/prisma';
async function main() {
  const result = {
    listingsWithoutLocation: await prisma.listing.count({ where: { merchantLocationId: null } }),
    ordersWithoutPurchaseSnapshot: await prisma.orderItem.count({ where: { snapshotCapturedAt: null } }),
    verifiedPaymentsWithoutEventTime: await prisma.payment.count({ where: { status: { in: ['SUCCESS','REFUNDED'] }, verifiedAt: null } }),
    settledRefundsWithoutEventTime: await prisma.refund.count({ where: { status: 'SETTLED', settledAt: null } }),
    paidOrdersWithoutAllocation: await prisma.order.count({ where: { status: { in: ['PAID','READY_FOR_PICKUP','COMPLETED','NO_SHOW','REFUNDED'] }, acceptedPaymentId: null } }),
    multipleSuccessfulPayments: await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM (SELECT "orderId" FROM "Payment" WHERE status='SUCCESS' GROUP BY "orderId" HAVING count(*)>1) p`,
    inventoryHistoryMismatch: await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM "ListingInventory" i LEFT JOIN LATERAL (SELECT * FROM "ListingInventoryMovement" m WHERE m."listingId"=i."listingId" ORDER BY m."inventoryVersion" DESC LIMIT 1) m ON true WHERE m.id IS NULL OR ROW(i.version,i."totalQuantity",i."reservedQuantity",i."soldQuantity") IS DISTINCT FROM ROW(m."inventoryVersion",m."resultingTotal",m."resultingReserved",m."resultingSold")`,
    openReconciliations: await prisma.reconciliationCase.count({ where: { status: 'OPEN' } }),
  };
  console.log(JSON.stringify(result, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}
main().catch(() => { console.error('History preflight failed; check target database and migrations.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
