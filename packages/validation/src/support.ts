import { z } from 'zod';

export const SupportChannelTypeEnum = z.enum(['CUSTOMER_ADMIN', 'MERCHANT_ADMIN']);
export const SupportConversationStatusEnum = z.enum(['OPEN', 'RESOLVED', 'CLOSED']);
export const SupportPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const SupportMessageSenderTypeEnum = z.enum(['ADMIN', 'MERCHANT', 'CUSTOMER', 'SYSTEM']);
export const SupportAttachmentTypeEnum = z.enum(['IMAGE', 'DOCUMENT', 'OTHER']);

export const SendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'متن پیام نمی‌تواند خالی باشد')
    .max(4000, 'متن پیام نمی‌تواند بیش از ۴۰۰۰ کاراکتر باشد'),
  clientMessageId: z.string().trim().max(100).optional(),
  attachmentIds: z.array(z.string().uuid()).max(5, 'حداکثر ۵ فایل در یک پیام مجاز است').optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export const CreateConversationSchema = z.object({
  channelType: SupportChannelTypeEnum.default('CUSTOMER_ADMIN'),
  merchantId: z.string().uuid().optional().nullable(),
  subject: z.string().trim().max(200, 'عنوان گفتگو حداکثر ۲۰۰ کاراکتر است').optional(),
  initialMessage: z
    .string()
    .trim()
    .max(4000, 'متن پیام حداکثر ۴۰۰۰ کاراکتر است')
    .optional(),
  attachmentIds: z.array(z.string().uuid()).max(5).optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;

export const UpdateConversationStatusSchema = z.object({
  status: SupportConversationStatusEnum,
  priority: SupportPriorityEnum.optional(),
});

export type UpdateConversationStatusInput = z.infer<typeof UpdateConversationStatusSchema>;

export const ConversationFilterSchema = z.object({
  status: z.enum(['ALL', 'OPEN', 'RESOLVED', 'CLOSED']).default('ALL'),
  channelType: z.enum(['ALL', 'CUSTOMER_ADMIN', 'MERCHANT_ADMIN']).default('ALL'),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ConversationFilterInput = z.infer<typeof ConversationFilterSchema>;
