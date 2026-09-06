/**
 * @loqme/validation — Shared Validation Schemas and Persian Utilities
 * Universal validation logic runnable in Web, Mobile, and Node.js environments
 */

import { z } from 'zod';

// ==========================================
// 1. Persian String & Digit Utilities
// ==========================================

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Converts English and Arabic numbers into Persian digits
 */
export function toPersianDigits(input: string | number | bigint): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

/**
 * Converts Persian and Arabic digits into standard English ASCII digits
 */
export function toEnglishDigits(input: string): string {
  if (!input) return '';
  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i));
    result = result.replace(new RegExp(ARABIC_DIGITS[i], 'g'), String(i));
  }
  return result;
}

/**
 * Formats amount in Toman with thousand separators and Persian digits
 * e.g. 25000 -> "۲۵,۰۰۰ تومان"
 */
export function formatToman(amount: number | bigint): string {
  const formatted = Number(amount).toLocaleString('en-US');
  return `${toPersianDigits(formatted)} تومان`;
}

/**
 * Validates Iranian mobile phone number format (09xxxxxxxxx or +989xxxxxxxxx)
 */
export function isValidIranianMobile(mobile: string): boolean {
  const cleaned = toEnglishDigits(mobile).trim();
  return /^(?:(?:\+98|0098|98)?0?)(9\d{9})$/.test(cleaned);
}

/**
 * Normalizes Iranian mobile numbers to standard local format (09xxxxxxxxx)
 */
export function normalizeIranianMobile(mobile: string): string {
  const cleaned = toEnglishDigits(mobile).replace(/\s+/g, '').replace(/[-_]/g, '');
  const match = cleaned.match(/^(?:(?:\+98|0098|98)?0?)(9\d{9})$/);
  if (!match) {
    throw new Error('شماره موبایل وارد شده معتبر نمی‌باشد');
  }
  return `0${match[1]}`;
}

// ==========================================
// 2. Authentication Validation Schemas
// ==========================================

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

// ==========================================
// 3. Marketplace Domain Schemas (M02–M04 preview)
// ==========================================

export const CreateSurpriseBagSchema = z.object({
  title: z.string().min(3, 'عنوان بسته باید حداقل ۳ حرف باشد'),
  description: z.string().max(500, 'توضیحات نمی‌تواند بیش از ۵۰۰ حرف باشد').optional(),
  categoryId: z.string().min(1, 'انتخاب دسته‌بندی الزامی است'),
  originalPrice: z.number().int().positive('قیمت اصلی باید بزرگتر از صفر باشد'),
  discountedPrice: z.number().int().positive('قیمت با تخفیف باید بزرگتر از صفر باشد'),
  quantity: z.number().int().min(1, 'تعداد موجودی باید حداقل ۱ باشد'),
  pickupStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'ساعت شروع تحویل نامعتبر است (مثال: ۲۰:۰۰)'),
  pickupEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'ساعت پایان تحویل نامعتبر است (مثال: ۲۲:۰۰)'),
}).refine((data) => data.discountedPrice < data.originalPrice, {
  message: 'قیمت تخفیف‌خورده باید کمتر از قیمت اصلی باشد',
  path: ['discountedPrice'],
});

export type CreateSurpriseBagInput = z.infer<typeof CreateSurpriseBagSchema>;

export const CheckoutOrderSchema = z.object({
  listingId: z.string().min(1, 'شناسه محصول الزامی است'),
  quantity: z.number().int().min(1, 'حداقل تعداد خرید ۱ عدد می‌باشد'),
});

export type CheckoutOrderInput = z.infer<typeof CheckoutOrderSchema>;
