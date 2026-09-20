/**
 * @loqme/validation — Shared Validation Schemas and Persian Utilities
 * Universal validation logic runnable in Web, Mobile, and Node.js environments
 */

import { z } from 'zod';
export * from './business';

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

export type CreateSurpriseBagInput = z.input<typeof CreateSurpriseBagSchema>;

export const CreateListingSchema = z.object({
  imageUrl: z.string().max(500).optional(),
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

export const CreateReservationSchema = z.object({
  listingId: z.string().min(1, 'شناسه بسته الزامی است'),
  quantity: z.coerce.number().int().min(1, 'حداقل تعداد رزرو ۱ عدد است').max(5, 'حداکثر تعداد رزرو در هر سفارش ۵ عدد است').default(1),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export const CheckoutOrderSchema = z.object({
  reservationId: z.string().min(1, 'شناسه رزرو الزامی است'),
  gateway: z.enum(['MOCK', 'ZARINPAL', 'SAMAN', 'SADAD']).default('MOCK'),
  notesFa: z.string().max(250, 'یادداشت نمی‌تواند بیش از ۲۵۰ کاراکتر باشد').optional(),
  termsAccepted: z.boolean().refine((v) => v === true, {
    message: 'پذیرش تعهد تحویل حضوری و قوانین اقلام فاسدشدنی الزامی است',
  }),
});

export type CheckoutOrderInput = z.infer<typeof CheckoutOrderSchema>;

export const PaymentVerifySchema = z.object({
  authority: z.string().min(3, 'شناسه رهگیری پرداخت نامعتبر است'),
  status: z.string().optional(),
  trackingCode: z.string().optional(),
});

export type PaymentVerifyInput = z.infer<typeof PaymentVerifySchema>;

export const ListingSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'عبارت جستجو باید حداقل ۲ کاراکتر باشد').max(100, 'عبارت جستجو بیش از حد طولانی است'),
  cityId: z.string().optional(),
  neighborhoodId: z.string().optional(),
  categoryId: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type ListingSearchQueryInput = z.infer<typeof ListingSearchQuerySchema>;

export const MarketplaceFilterSchema = z.object({
  scope: z.enum(['nearby', 'all']).default('nearby'),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  q: z.string().trim().max(100).optional(),
  categorySlug: z.string().max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusMeters: z.coerce.number().min(100).max(25000).default(5000),
  radiusKm: z.coerce.number().min(0.1).max(25).optional(),
  cityId: z.string().optional(),
  neighborhoodId: z.string().optional(),
  neighborhoodSlug: z.string().optional(),
  categoryId: z.string().optional(),
  businessType: z.enum(['BAKERY', 'CAFE', 'RESTAURANT', 'SUPERMARKET', 'DELI', 'PRODUCE']).optional(),
  minDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  maxPriceToman: z.coerce.number().min(0).optional(),
  dietaryTag: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(30),
}).transform((data) => ({
  ...data,
  latitude: data.latitude ?? data.lat ?? 37.5342,
  longitude: data.longitude ?? data.lng ?? 45.0681,
  radiusMeters: data.radiusKm ? Math.round(data.radiusKm * 1000) : data.radiusMeters,
}));

export type MarketplaceFilterInput = z.infer<typeof MarketplaceFilterSchema>;

export const ToggleFavoriteSchema = z.object({
  merchantId: z.string().uuid('شناسه فروشگاه نامعتبر است'),
});

export type ToggleFavoriteInput = z.infer<typeof ToggleFavoriteSchema>;

// ==========================================
// 9. Milestone M05: Pickup Verification Schemas
// ==========================================

export const VerifyPickupSchema = z
  .object({
    qrToken: z.string().trim().optional(),
    otpCode: z
      .string()
      .optional()
      .transform((val) => (val ? toEnglishDigits(val).trim() : undefined)),
    orderNumber: z
      .string()
      .optional()
      .transform((val) => (val ? toEnglishDigits(val).trim().toUpperCase() : undefined)),
    orderId: z.string().optional(),
  })
  .refine((data) => Boolean(data.qrToken || data.otpCode), {
    message: 'ارائه توکن اسکن QR یا کد ۴ رقمی تحویل الزامی است',
    path: ['otpCode'],
  });

export type VerifyPickupInput = z.infer<typeof VerifyPickupSchema>;

export const PickupCredentialsQuerySchema = z.object({
  orderId: z.string().min(1, 'شناسه سفارش الزامی است'),
});

export type PickupCredentialsQueryInput = z.infer<typeof PickupCredentialsQuerySchema>;

// ==========================================
// 10. Milestone M06: Trust, Safety & Moderation Schemas
// ==========================================

export const CreateReviewSchema = z
  .object({
    orderId: z.string().min(1, 'شناسه سفارش الزامی است'),
    overallRating: z.coerce.number().int().min(1, 'امتیاز باید بین ۱ تا ۵ باشد').max(5, 'امتیاز باید بین ۱ تا ۵ باشد').optional(),
    ratingScore: z.coerce.number().int().min(1, 'امتیاز باید بین ۱ تا ۵ باشد').max(5, 'امتیاز باید بین ۱ تا ۵ باشد').optional(),
    qualityRating: z.coerce.number().int().min(1, 'کیفیت غذا باید بین ۱ تا ۵ باشد').max(5, 'کیفیت غذا باید بین ۱ تا ۵ باشد').optional(),
    foodQualityScore: z.coerce.number().int().min(1, 'کیفیت غذا باید بین ۱ تا ۵ باشد').max(5, 'کیفیت غذا باید بین ۱ تا ۵ باشد').optional(),
    valueRating: z.coerce.number().int().min(1, 'ارزش خرید باید بین ۱ تا ۵ باشد').max(5, 'ارزش خرید باید بین ۱ تا ۵ باشد').optional(),
    valueScore: z.coerce.number().int().min(1, 'ارزش خرید باید بین ۱ تا ۵ باشد').max(5, 'ارزش خرید باید بین ۱ تا ۵ باشد').optional(),
    commentFa: z.string().max(1000, 'متن نظر نمی‌تواند بیش از ۱۰۰۰ حرف باشد').optional(),
  })
  .refine(
    (d) =>
      (d.overallRating !== undefined && d.overallRating >= 1 && d.overallRating <= 5) ||
      (d.ratingScore !== undefined && d.ratingScore >= 1 && d.ratingScore <= 5),
    { message: 'امتیاز کلی باید بین ۱ تا ۵ باشد' }
  )
  .transform((data) => ({
    orderId: data.orderId,
    overallRating: data.overallRating ?? data.ratingScore ?? 5,
    qualityRating: data.qualityRating ?? data.foodQualityScore ?? 5,
    valueRating: data.valueRating ?? data.valueScore ?? 5,
    commentFa: data.commentFa,
  }));

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export const MerchantReplyReviewSchema = z.object({
  replyFa: z.string().trim().min(3, 'متن پاسخ باید حداقل ۳ حرف باشد').max(1000, 'متن پاسخ نمی‌تواند بیش از ۱۰۰۰ حرف باشد'),
});

export type MerchantReplyReviewInput = z.infer<typeof MerchantReplyReviewSchema>;

export const CreateComplaintSchema = z
  .object({
    orderId: z.string().min(1, 'شناسه سفارش الزامی است'),
    category: z.enum([
      'EXPIRED_FOOD',
      'SPOILED_FOOD',
      'MISMATCHED_DESCRIPTION',
      'POOR_HYGIENE',
      'STORE_CLOSED',
      'MISSING_ITEMS',
      'OTHER',
      'VALUE_DEFICIT',
      'WRONG_ITEMS',
    ]),
    descriptionFa: z
      .string()
      .trim()
      .min(10, 'لطفاً توضیحات کامل‌تری (حداقل ۱۰ حرف) درباره مشکل ارائه نمایید')
      .max(2000, 'توضیحات نمی‌تواند بیش از ۲۰۰۰ حرف باشد'),
    evidencePhotos: z.array(z.string()).optional(),
    evidenceImageUrls: z.array(z.string()).optional(),
  })
  .transform((data) => ({
    orderId: data.orderId,
    category: data.category === 'VALUE_DEFICIT' ? 'MISMATCHED_DESCRIPTION' : data.category === 'WRONG_ITEMS' ? 'MISSING_ITEMS' : data.category,
    descriptionFa: data.descriptionFa,
    evidencePhotos: data.evidencePhotos ?? data.evidenceImageUrls ?? [],
  }));

export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;

export const ResolveComplaintSchema = z
  .object({
    action: z.enum(['REFUND', 'REJECT', 'WARNING']).optional(),
    status: z
      .enum([
        'OPEN',
        'INVESTIGATING',
        'RESOLVED_REFUND',
        'DISMISSED',
        'PENDING',
        'RESOLVED_REFUNDED',
        'RESOLVED_REJECTED',
        'RESOLVED_WARNING',
      ])
      .optional(),
    notesFa: z.string().max(2000).optional(),
    adminNotesFa: z.string().max(2000).optional(),
    authorizeRefund: z.boolean().default(false).optional(),
    refundAmountToman: z.coerce.number().int().positive().optional(),
  })
  .transform((data) => ({
    action: (data.action ??
      (data.authorizeRefund || data.status === 'RESOLVED_REFUND' || data.status === 'RESOLVED_REFUNDED'
        ? 'REFUND'
        : data.status === 'DISMISSED' || data.status === 'RESOLVED_REJECTED'
        ? 'REJECT'
        : 'WARNING')) as 'REFUND' | 'REJECT' | 'WARNING',
    notesFa: data.notesFa ?? data.adminNotesFa,
    refundAmountToman: data.refundAmountToman,
  }));

export type ResolveComplaintInput = z.infer<typeof ResolveComplaintSchema>;

export const UpdateListingSafetySchema = z
  .object({
    safetyStatus: z.enum([
      'PENDING_REVIEW',
      'APPROVED',
      'RESTRICTED',
      'REJECTED',
      'UNSAFE',
      'EXPIRED',
    ]),
    reasonFa: z.string().trim().max(1000).optional(),
    reason: z.string().trim().max(1000).optional(),
  })
  .transform((data) => ({
    safetyStatus: data.safetyStatus,
    reasonFa: data.reasonFa ?? data.reason,
  }));

export type UpdateListingSafetyInput = z.infer<typeof UpdateListingSafetySchema>;

// ==========================================
// 8. Merchant Portal Validation Schemas (Milestone M07)
// ==========================================

export const FastCreateListingSchema = z
  .object({
    imageUrl: z.string().max(500).optional(),
    categoryId: z.string().optional(),
    categorySlug: z.string().optional(),
    titleFa: z.string().trim().min(3, 'عنوان بسته حداقل باید ۳ کاراکتر باشد').max(100),
    descriptionFa: z.string().trim().min(5, 'توضیحات بسته حداقل باید ۵ کاراکتر باشد').max(1000),
    originalPriceToman: z.coerce.number().positive('قیمت اصلی باید مقداری مثبت باشد'),
    discountedPriceToman: z.coerce.number().positive('قیمت با تخفیف باید مقداری مثبت باشد'),
    quantity: z.coerce.number().int().min(1, 'حداقل تعداد بسته ۱ عدد می‌باشد').max(100, 'حداکثر ۱۰۰ بسته مجاز است'),
    pickupDate: z.string().optional(),
    pickupStart: z.string().optional(),
    pickupEnd: z.string().optional(),
    allergens: z.array(z.string()).default([]),
    dietaryTags: z.array(z.string()).default([]),
    storageInstructionsFa: z.string().optional(),
    temperatureRequirement: z
      .enum(['ROOM_TEMP', 'CHILLED', 'FROZEN'])
      .default('ROOM_TEMP'),
  })
  .refine((data) => data.discountedPriceToman < data.originalPriceToman, {
    message: 'قیمت با تخفیف باید کمتر از قیمت اصلی باشد',
    path: ['discountedPriceToman'],
  });

export type FastCreateListingInput = z.infer<typeof FastCreateListingSchema>;

export const AdminMerchantAccountSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('UPDATE_ACCOUNT'), expectedOwnerId: z.string().uuid(), fullName: z.string().trim().min(2, 'نام حداقل دو حرف باشد').max(100), isActive: z.boolean(), reasonFa: z.string().trim().min(5, 'علت تغییر را وارد کنید').max(500) }),
  z.object({ action: z.literal('ASSIGN_OWNER'), expectedOwnerId: z.string().uuid(), mobile: z.string().transform(normalizeIranianMobile).refine(isValidIranianMobile, 'شماره موبایل معتبر نیست'), fullName: z.string().trim().min(2).max(100), reasonFa: z.string().trim().min(5, 'علت تغییر را وارد کنید').max(500) }),
]);
export type AdminMerchantAccountInput = z.infer<typeof AdminMerchantAccountSchema>;

export const UpdateListingStockSchema = z.object({
  deltaQuantity: z.number().int().optional(),
  totalQuantity: z.number().int().min(0).optional(),
  status: z.enum(['PUBLISHED', 'PAUSED', 'SOLD_OUT', 'ARCHIVED']).optional(),
});

export type UpdateListingStockInput = z.infer<typeof UpdateListingStockSchema>;

export const CreateStaffSchema = z.object({
  mobile: z
    .string({ required_error: 'شماره موبایل الزامی است' })
    .trim()
    .min(1, 'شماره موبایل الزامی است')
    .refine((val) => isValidIranianMobile(val), {
      message: 'شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد',
    })
    .transform((val) => normalizeIranianMobile(val)),
  fullName: z.string().trim().max(100).optional(),
  role: z.enum(['MANAGER', 'CASHIER'], {
    errorMap: () => ({ message: 'نقش باید یکی از گزینه‌های مدیر یا صندوق‌دار باشد' }),
  }),
  canScanPickup: z.boolean().default(true),
});

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;

export const OperatingHoursDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  storeOpenTime: z.string().regex(/^\d{2}:\d{2}$/, 'فرمت زمان باید HH:mm باشد'),
  storeCloseTime: z.string().regex(/^\d{2}:\d{2}$/, 'فرمت زمان باید HH:mm باشد'),
  defaultPickupStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'فرمت زمان باید HH:mm باشد').nullable(),
  defaultPickupEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'فرمت زمان باید HH:mm باشد').nullable(),
}).refine(day => (day.defaultPickupStart === null && day.defaultPickupEnd === null) || (!!day.defaultPickupStart && !!day.defaultPickupEnd && day.defaultPickupEnd > day.defaultPickupStart), { message: 'شروع و پایان بازه تحویل را با هم و به ترتیب وارد کنید', path: ['defaultPickupEnd'] });

export const UpdateStoreSettingsSchema = z.object({
  businessNameFa: z.string().trim().min(2, 'نام فروشگاه حداقل باید ۲ کاراکتر باشد').max(100).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  addressFa: z.string().trim().min(5, 'آدرس حداقل باید ۵ کاراکتر باشد').max(255).optional(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  hours: z.array(OperatingHoursDaySchema).optional(),
});

export type UpdateStoreSettingsInput = z.infer<typeof UpdateStoreSettingsSchema>;

// ==========================================
// 9. Admin Platform Validation Schemas (Milestone M08)
// ==========================================

export const AdminUpdateMerchantSchema = z.object({
  verificationStatus: z
    .enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'])
    .optional(),
  commissionPercent: z.coerce.number().min(0, 'کارمزد نمی‌تواند منفی باشد').max(50, 'حداکثر کارمزد ۵۰٪ است').optional(),
  reasonFa: z.string().trim().max(1000).optional(),
});

export type AdminUpdateMerchantInput = z.infer<typeof AdminUpdateMerchantSchema>;

export const AdminUpdateCustomerSchema = z.object({
  isActive: z.boolean(),
  reasonFa: z.string().trim().max(1000).optional(),
});

export type AdminUpdateCustomerInput = z.infer<typeof AdminUpdateCustomerSchema>;

export const CreateCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, 'شناسه انگلیسی حداقل ۲ کاراکتر است')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'شناسه باید با حروف کوچک انگلیسی و خط تیره باشد'),
  nameFa: z.string().trim().min(2, 'نام فارسی دسته‌بندی حداقل ۲ کاراکتر است').max(100),
  iconUrl: z.string().trim().max(255).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateSystemSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  announcementBannerFa: z.string().trim().max(500).optional(),
  activeSmsProvider: z.enum(['MOCK', 'KAVENEGAR', 'FARAZSMS']).optional(),
});

export type UpdateSystemSettingsInput = z.infer<typeof UpdateSystemSettingsSchema>;

// ==========================================
// 10. Marketplace Analytics Schemas (Milestone M09)
// ==========================================

export const AnalyticsQuerySchema = z.object({
  timeframe: z.enum(['TODAY', '7D', '30D', '90D', '1Y', 'CUSTOM']).default('30D'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  merchantId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
});

export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>;

