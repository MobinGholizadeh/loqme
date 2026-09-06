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
// 3. Marketplace Domain Schemas (M02)
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
  allergens: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  storageInstructionsFa: z.string().optional(),
  temperatureRequirement: z.enum(['ROOM_TEMP', 'CHILLED', 'FROZEN']).default('ROOM_TEMP'),
}).refine((data) => data.discountedPrice < data.originalPrice, {
  message: 'قیمت تخفیف‌خورده باید کمتر از قیمت اصلی باشد',
  path: ['discountedPrice'],
});

export type CreateSurpriseBagInput = z.infer<typeof CreateSurpriseBagSchema>;

export const CreateListingSchema = z.object({
  merchantId: z.string().uuid('شناسه فروشگاه نامعتبر است'),
  merchantLocationId: z.string().uuid('شناسه شعبه نامعتبر است').optional(),
  categoryId: z.string().min(1, 'شناسه دسته‌بندی الزامی است'),
  type: z.enum(['SURPRISE_BAG', 'FLASH_DEAL']).default('SURPRISE_BAG'),
  titleFa: z.string().min(3, 'عنوان آگهی باید حداقل ۳ حرف باشد'),
  descriptionFa: z.string().max(1000).optional(),
  originalPriceToman: z.number().int().positive('قیمت اصلی باید بزرگتر از صفر باشد'),
  discountedPriceToman: z.number().int().positive('قیمت تخفیف‌خورده باید بزرگتر از صفر باشد'),
  pickupDate: z.union([z.string(), z.date()]),
  pickupStart: z.union([z.string(), z.date()]),
  pickupEnd: z.union([z.string(), z.date()]),
  quantity: z.number().int().min(1, 'تعداد موجودی باید حداقل ۱ باشد'),
  allergens: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  storageInstructionsFa: z.string().optional(),
  temperatureRequirement: z.enum(['ROOM_TEMP', 'CHILLED', 'FROZEN']).default('ROOM_TEMP'),
}).refine((data) => data.discountedPriceToman < data.originalPriceToman, {
  message: 'قیمت تخفیف‌خورده باید کمتر از قیمت اصلی باشد',
  path: ['discountedPriceToman'],
}).refine((data) => new Date(data.pickupEnd).getTime() > new Date(data.pickupStart).getTime(), {
  message: 'زمان پایان تحویل باید بعد از زمان شروع تحویل باشد',
  path: ['pickupEnd'],
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const CreateMerchantSchema = z.object({
  ownerUserId: z.string().uuid('شناسه مالک نامعتبر است'),
  businessNameFa: z.string().min(3, 'نام کسب‌وکار باید حداقل ۳ حرف باشد'),
  businessType: z.enum(['BAKERY', 'CAFE', 'RESTAURANT', 'SUPERMARKET', 'DELI', 'PRODUCE']),
  licenseNumber: z.string().optional(),
  commissionPercent: z.number().min(0).max(100).default(10.0),
  location: z.object({
    cityId: z.string().min(1, 'انتخاب شهر الزامی است'),
    neighborhoodId: z.string().optional(),
    addressFa: z.string().min(5, 'آدرس باید حداقل ۵ حرف باشد'),
    postalCode: z.string().optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    phone: z.string().optional(),
  }),
});

export type CreateMerchantInput = z.infer<typeof CreateMerchantSchema>;

export const NearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(100).max(50000).default(5000),
  limit: z.coerce.number().min(1).max(100).default(20),
  businessType: z.enum(['BAKERY', 'CAFE', 'RESTAURANT', 'SUPERMARKET', 'DELI', 'PRODUCE']).optional(),
});

export type NearbyQueryInput = z.infer<typeof NearbyQuerySchema>;

export const UpdateListingStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'SOLD_OUT', 'EXPIRED']),
});

export type UpdateListingStatusInput = z.infer<typeof UpdateListingStatusSchema>;

export const CheckoutOrderSchema = z.object({
  listingId: z.string().min(1, 'شناسه محصول الزامی است'),
  quantity: z.number().int().min(1, 'حداقل تعداد خرید ۱ عدد می‌باشد'),
});

export type CheckoutOrderInput = z.infer<typeof CheckoutOrderSchema>;

