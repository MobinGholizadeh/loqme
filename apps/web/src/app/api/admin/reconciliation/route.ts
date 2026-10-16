import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  const [cases, stalled, pendingRefunds, unallocated] = await Promise.all([
    prisma.reconciliationCase.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'asc' }, take: 100,
      select: { id: true, merchantId: true, orderId: true, paymentId: true, reason: true, createdAt: true } }),
    prisma.paymentAttempt.findMany({ where: { state: 'SUBMITTING', updatedAt: { lt: new Date(Date.now()-300_000) } }, orderBy: { createdAt: 'asc' }, take: 100,
      select: { id: true, orderId: true, state: true, createdAt: true } }),
    prisma.refund.findMany({ where: { status: { in: ['REQUESTED', 'APPROVED'] }, createdAt: { lt: new Date(Date.now()-300_000) } }, orderBy: { createdAt: 'asc' }, take: 100,
      select: { id: true, orderId: true, createdAt: true } }),
    prisma.$queryRaw<{ id: string; orderId: string; createdAt: Date }[]>`SELECT p.id,p."orderId",p."createdAt" FROM "Payment" p JOIN "Order" o ON o.id=p."orderId"
      WHERE p.status='SUCCESS' AND o."acceptedPaymentId" IS DISTINCT FROM p.id AND COALESCE(p."verifiedAt",p."createdAt") < ${new Date(Date.now()-300_000)}
      AND NOT EXISTS (SELECT 1 FROM "ReconciliationCase" r WHERE r."paymentId"=p.id AND r.status='OPEN')
      ORDER BY p."createdAt" LIMIT 100`,
  ]);
  return NextResponse.json({ success: true, data: { cases, stalled, pendingRefunds: pendingRefunds.map(r => ({ ...r, state: 'REFUND_PENDING' })),
    unallocated: unallocated.map(p => ({ ...p, reason: 'UNALLOCATED_PAYMENT' })), limit: 100 } }, { headers: { 'Cache-Control': 'private, no-store' } });
}
