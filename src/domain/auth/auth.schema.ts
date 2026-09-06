import { z } from 'zod';
import { isValidIranianMobile, normalizeIranianMobile } from '@/lib/utils/persian';

export const RequestOtpSchema = z.object({
  mobile: z
    .string({ required_error: 'لطفاً شماره موبایل را وارد نمایید' })
    .trim()
    .min(1, 'شماره موبایل الزامی است')
    .refine((val) => isValidIranianMobile(val), {
      message: 'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد',
    })
    .transform((val) => normalizeIranianMobile(val)),
});

export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  mobile: z
    .string({ required_error: 'لطفاً شماره موبایل را وارد نمایید' })
    .trim()
    .min(1, 'شماره موبایل الزامی است')
    .refine((val) => isValidIranianMobile(val), {
      message: 'شماره موبایل معتبر نمی‌باشد',
    })
    .transform((val) => normalizeIranianMobile(val)),
  code: z
    .string({ required_error: 'لطفاً کد تایید را وارد نمایید' })
    .trim()
    .regex(/^\d{5}$/, 'کد تایید باید دقیقاً ۵ رقم عددی باشد'),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
