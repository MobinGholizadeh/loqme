import { z } from 'zod';

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url('آدرس endpoint معتبر نیست'),
  keys: z.object({
    p256dh: z.string().min(1, 'کلید p256dh الزامی است'),
    auth: z.string().min(1, 'کلید auth الزامی است'),
  }),
  userAgent: z.string().optional(),
});

export const UnsubscribePushSchema = z.object({
  endpoint: z.string().url('آدرس endpoint معتبر نیست'),
});

export const NotificationPreferenceSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  smsOrders: z.boolean().optional(),
  smsMarketing: z.boolean().optional(),
  notifyOrders: z.boolean().optional(),
  notifySupport: z.boolean().optional(),
  notifyFinance: z.boolean().optional(),
  notifySystem: z.boolean().optional(),
});

export const MarkNotificationReadSchema = z.object({
  notificationId: z.string().optional(),
  all: z.boolean().optional(),
});

export const NotificationQuerySchema = z.object({
  category: z.enum(['all', 'order', 'discount', 'system', 'support']).optional().default('all'),
  isRead: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type PushSubscriptionInputType = z.infer<typeof PushSubscriptionSchema>;
export type NotificationPreferenceInputType = z.infer<typeof NotificationPreferenceSchema>;
export type NotificationQueryInputType = z.infer<typeof NotificationQuerySchema>;
