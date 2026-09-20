import { z } from 'zod';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'ساعت معتبر وارد کنید');
export const BusinessHoursDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), isOpen: z.boolean(),
  storeOpenTime: z.union([time, z.literal('')]), storeCloseTime: z.union([time, z.literal('')]),
}).strict().superRefine((day, ctx) => {
  if (day.isOpen && (!day.storeOpenTime || !day.storeCloseTime || day.storeCloseTime <= day.storeOpenTime)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['storeCloseTime'], message: 'ساعت پایان باید بعد از ساعت شروع در همان روز باشد' });
  }
});
export const BusinessHoursSchema = z.array(BusinessHoursDaySchema).length(7, 'هر هفت روز هفته را مشخص کنید').superRefine((hours, ctx) => {
  if (new Set(hours.map(d => d.dayOfWeek)).size !== 7) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'روزهای هفته نباید تکراری باشند' });
  if (!hours.some(d => d.isOpen)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'حداقل یک روز کاری انتخاب کنید' });
});
export const BusinessDetailsSchema = z.object({
  businessNameFa: z.string().trim().min(2, 'نام کسب‌وکار را وارد کنید').max(100),
  businessType: z.enum(['BAKERY', 'CAFE', 'RESTAURANT', 'SUPERMARKET', 'DELI', 'PRODUCE']),
  cityId: z.string().min(1, 'شهر را انتخاب کنید').max(100),
  addressFa: z.string().trim().min(5, 'آدرس کامل را وارد کنید').max(255),
  latitude: z.number().finite().min(24).max(40), longitude: z.number().finite().min(44).max(64),
  phone: z.string().trim().max(30).nullable().optional(),
  licenseNumber: z.string().trim().max(100).nullable().optional(),
  mapirPlaceId: z.string().trim().min(1).max(200).nullable().optional(),
}).strict();
export const MerchantApplicationSchema = BusinessDetailsSchema.extend({
  ownerName: z.string().trim().min(2, 'نام و نام خانوادگی را وارد کنید').max(100),
  hours: BusinessHoursSchema,
}).strict();
export const ReviewMerchantApplicationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reasonFa: z.string().trim().min(5, 'دلیل بررسی را وارد کنید').max(1000),
  expectedRevision: z.number().int().positive(),
}).strict();

// Only known, same-origin application destinations may be used after authentication.
export function safeLoginRedirect(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (/[\\\u0000-\u0020]/.test(decoded) || decoded.startsWith('//')) return null;
    const url = new URL(value, 'https://loqme.shop');
    if (url.origin !== 'https://loqme.shop') return null;
    if (!/^\/(?:$|explore(?:\/|$)|checkout\/|orders(?:\/|$)|profile(?:\/|$)|merchant(?:\/|$)|admin(?:\/|$)|business(?:\/|$)|listings\/|merchants\/)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}
