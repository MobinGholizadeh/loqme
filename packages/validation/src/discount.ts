import { z } from 'zod';

export const DiscountTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);
export const DiscountOwnerTypeSchema = z.enum(['ADMIN', 'MERCHANT']);
export const DiscountScopeSchema = z.enum(['PLATFORM', 'MERCHANT', 'CATEGORY', 'LISTING']);
export const DiscountApplicationMethodSchema = z.enum(['COUPON_CODE', 'AUTOMATIC']);
export const DiscountFundingSourceSchema = z.enum(['PLATFORM', 'MERCHANT']);

export const CreateDiscountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, { message: 'کد تخفیف باید حداقل ۲ کاراکتر باشد' })
      .max(32, { message: 'کد تخفیف حداکثر می‌تواند ۳۲ کاراکتر باشد' })
      .regex(/^[A-Za-z0-9_-]+$/, { message: 'کد تخفیف فقط می‌تواند شامل حروف انگلیسی، اعداد، خط تیره و زیرخط باشد' })
      .optional()
      .nullable(),
    titleFa: z
      .string()
      .trim()
      .min(2, { message: 'عنوان تخفیف الزامی است و باید حداقل ۲ کاراکتر باشد' })
      .max(120, { message: 'عنوان تخفیف حداکثر می‌تواند ۱۲۰ کاراکتر باشد' }),
    descriptionFa: z.string().trim().max(500).optional().nullable(),
    ownerType: DiscountOwnerTypeSchema.default('ADMIN'),
    merchantId: z.string().optional().nullable(),
    discountType: DiscountTypeSchema,
    discountPercent: z.number().min(1).max(100).optional().nullable(),
    discountAmountToman: z.number().nonnegative().optional().nullable(),
    maxDiscountAmountToman: z.number().nonnegative().optional().nullable(),
    minOrderAmountToman: z.number().nonnegative().default(0),
    applicationMethod: DiscountApplicationMethodSchema.default('COUPON_CODE'),
    scope: DiscountScopeSchema.default('PLATFORM'),
    categoryId: z.string().optional().nullable(),
    listingId: z.string().optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    maxUses: z.number().int().positive().optional().nullable(),
    maxUsesPerCustomer: z.number().int().positive().default(1),
    isCombinable: z.boolean().default(false),
    isActive: z.boolean().default(true),
    fundingSource: DiscountFundingSourceSchema.default('PLATFORM'),
  })
  .refine(
    (data) => {
      if (data.applicationMethod === 'COUPON_CODE') {
        return !!data.code && data.code.trim().length > 0;
      }
      return true;
    },
    { message: 'برای تخفیف‌های کوپنی، وارد کردن کد تخفیف الزامی است', path: ['code'] }
  )
  .refine(
    (data) => {
      if (data.discountType === 'PERCENTAGE') {
        return typeof data.discountPercent === 'number' && data.discountPercent > 0 && data.discountPercent <= 100;
      }
      return true;
    },
    { message: 'درصد تخفیف باید عددی بین ۱ تا ۱۰۰ باشد', path: ['discountPercent'] }
  )
  .refine(
    (data) => {
      if (data.discountType === 'FIXED_AMOUNT') {
        return typeof data.discountAmountToman === 'number' && data.discountAmountToman > 0;
      }
      return true;
    },
    { message: 'مبلغ تخفیف ثابت باید بیشتر از صفر باشد', path: ['discountAmountToman'] }
  )
  .refine(
    (data) => {
      if (data.ownerType === 'MERCHANT' && !data.merchantId) {
        return false;
      }
      return true;
    },
    { message: 'برای تخفیف فروشگاه، شناسه فروشگاه الزامی است', path: ['merchantId'] }
  )
  .refine(
    (data) => {
      if (data.scope === 'MERCHANT' && !data.merchantId) {
        return false;
      }
      if (data.scope === 'CATEGORY' && !data.categoryId) {
        return false;
      }
      if (data.scope === 'LISTING' && !data.listingId) {
        return false;
      }
      return true;
    },
    { message: 'هدف دامنه تخفیف به درستی مشخص نشده است', path: ['scope'] }
  )
  .refine(
    (data) => {
      if (data.startsAt && data.expiresAt) {
        return new Date(data.expiresAt) > new Date(data.startsAt);
      }
      return true;
    },
    { message: 'تاریخ انقضا باید پس از تاریخ شروع باشد', path: ['expiresAt'] }
  );

export const UpdateDiscountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, { message: 'کد تخفیف باید حداقل ۲ کاراکتر باشد' })
      .max(32, { message: 'کد تخفیف حداکثر می‌تواند ۳۲ کاراکتر باشد' })
      .regex(/^[A-Za-z0-9_-]+$/, { message: 'کد تخفیف فقط می‌تواند شامل حروف انگلیسی، اعداد، خط تیره و زیرخط باشد' })
      .optional()
      .nullable(),
    titleFa: z
      .string()
      .trim()
      .min(2, { message: 'عنوان تخفیف الزامی است و باید حداقل ۲ کاراکتر باشد' })
      .max(120, { message: 'عنوان تخفیف حداکثر می‌تواند ۱۲۰ کاراکتر باشد' })
      .optional(),
    descriptionFa: z.string().trim().max(500).optional().nullable(),
    discountType: DiscountTypeSchema.optional(),
    discountPercent: z.number().min(1).max(100).optional().nullable(),
    discountAmountToman: z.number().nonnegative().optional().nullable(),
    maxDiscountAmountToman: z.number().nonnegative().optional().nullable(),
    minOrderAmountToman: z.number().nonnegative().optional(),
    applicationMethod: DiscountApplicationMethodSchema.optional(),
    scope: DiscountScopeSchema.optional(),
    categoryId: z.string().optional().nullable(),
    listingId: z.string().optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    maxUses: z.number().int().positive().optional().nullable(),
    maxUsesPerCustomer: z.number().int().positive().optional().nullable(),
    isCombinable: z.boolean().optional(),
    isActive: z.boolean().optional(),
    fundingSource: DiscountFundingSourceSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.expiresAt) {
        return new Date(data.expiresAt) > new Date(data.startsAt);
      }
      return true;
    },
    { message: 'تاریخ انقضا باید پس از تاریخ شروع باشد', path: ['expiresAt'] }
  );

export const ValidateCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, { message: 'کد تخفیف نمی‌تواند خالی باشد' }),
  merchantId: z.string().min(1, { message: 'شناسه فروشگاه الزامی است' }),
  listingId: z.string().min(1, { message: 'شناسه محصول الزامی است' }),
  subtotalToman: z.number().nonnegative({ message: 'مبلغ سفارش نمی‌تواند منفی باشد' }),
  customerId: z.string().optional(),
  reservationId: z.string().optional(),
});

export const BulkGenerateDiscountsSchema = z.object({
  prefix: z.string().trim().max(10).default('LQ'),
  count: z.number().int().min(1).max(1000).default(10),
  titleFa: z.string().trim().min(2, { message: 'عنوان تخفیف الزامی است' }).max(120),
  descriptionFa: z.string().trim().max(500).optional().nullable(),
  discountType: DiscountTypeSchema,
  discountPercent: z.number().min(1).max(100).optional().nullable(),
  discountAmountToman: z.number().nonnegative().optional().nullable(),
  maxDiscountAmountToman: z.number().nonnegative().optional().nullable(),
  minOrderAmountToman: z.number().nonnegative().default(0),
  scope: DiscountScopeSchema.default('PLATFORM'),
  merchantId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  listingId: z.string().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUsesPerCode: z.number().int().positive().default(1),
  maxUsesPerCustomer: z.number().int().positive().default(1),
  fundingSource: DiscountFundingSourceSchema.default('PLATFORM'),
});
