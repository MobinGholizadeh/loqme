import { z } from 'zod';
export const MerchantReportQuerySchema = z.object({
  merchantId: z.string().uuid(), locationId: z.string().uuid().optional(), days: z.enum(['7', '30']).default('7'),
}).strict();
export const ReconcilePaymentSchema = z.object({ action: z.enum(['RECHECK', 'RESOLVE']) }).strict();
