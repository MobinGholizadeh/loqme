import type { Prisma } from '@prisma/client';
/** Transaction-local only: pooled connections cannot retain a previous actor. */
export async function setHistoryActor(tx: Prisma.TransactionClient, actorId?: string, reason = 'MERCHANT_EDIT') {
  if (actorId) await tx.$queryRaw`SELECT set_config('loqme.actor_id', ${actorId}, true), set_config('loqme.reason_code', ${reason}, true)`;
}
