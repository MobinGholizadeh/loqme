import { toEnglishDigits } from '@loqme/validation';
import type { DiscountErrorCode, DiscountOperationalStatus } from '@loqme/types';

export interface DiscountCalculationContext {
  customerId?: string;
  merchantId: string;
  listingId: string;
  categoryId?: string | null;
  subtotalToman: bigint;
  customerUsageCount?: number;
  now?: Date;
}

export interface DiscountEntityLike {
  id: string;
  code?: string | null;
  titleFa: string;
  ownerType: 'ADMIN' | 'MERCHANT';
  merchantId?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountPercent?: number | { toNumber?: () => number } | null;
  discountAmountToman?: bigint | number | null;
  maxDiscountAmountToman?: bigint | number | null;
  minOrderAmountToman?: bigint | number | null;
  applicationMethod: 'COUPON_CODE' | 'AUTOMATIC';
  scope: 'PLATFORM' | 'MERCHANT' | 'CATEGORY' | 'LISTING';
  categoryId?: string | null;
  listingId?: string | null;
  startsAt: Date;
  expiresAt?: Date | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  currentUses: number;
  isActive: boolean;
  fundingSource: 'PLATFORM' | 'MERCHANT';
}

export class DiscountEngine {
  /**
   * Normalizes coupon code for consistent lookup:
   * - Converts Persian and Arabic digits to English
   * - Removes leading/trailing spaces
   * - Converts to uppercase
   */
  static normalizeCouponCode(code: string | null | undefined): string {
    if (!code) return '';
    const english = toEnglishDigits(code.trim());
    return english.toUpperCase();
  }

  /**
   * Determines current operational status of a discount
   */
  static getOperationalStatus(
    discount: Pick<DiscountEntityLike, 'isActive' | 'startsAt' | 'expiresAt' | 'maxUses' | 'currentUses'>,
    now: Date = new Date()
  ): DiscountOperationalStatus {
    if (!discount.isActive) {
      return 'INACTIVE';
    }
    if (discount.startsAt && new Date(discount.startsAt) > now) {
      return 'SCHEDULED';
    }
    if (discount.expiresAt && new Date(discount.expiresAt) <= now) {
      return 'EXPIRED';
    }
    if (discount.maxUses !== null && discount.maxUses !== undefined && discount.currentUses >= discount.maxUses) {
      return 'DEPLETED';
    }
    return 'ACTIVE';
  }

  /**
   * Validates if a discount can be applied to the current checkout context
   */
  static checkEligibility(
    discount: DiscountEntityLike,
    context: DiscountCalculationContext
  ): { eligible: boolean; errorCode?: DiscountErrorCode; errorMessageFa?: string } {
    const now = context.now || new Date();

    // 1. Status checks
    const status = this.getOperationalStatus(discount, now);
    if (status === 'INACTIVE') {
      return { eligible: false, errorCode: 'INACTIVE', errorMessageFa: 'این کد تخفیف در حال حاضر غیرفعال است' };
    }
    if (status === 'SCHEDULED') {
      return { eligible: false, errorCode: 'NOT_STARTED', errorMessageFa: 'زمان استفاده از این کد تخفیف هنوز فرا نرسیده است' };
    }
    if (status === 'EXPIRED') {
      return { eligible: false, errorCode: 'EXPIRED', errorMessageFa: 'مهلت استفاده از این کد تخفیف به پایان رسیده است' };
    }
    if (status === 'DEPLETED') {
      return { eligible: false, errorCode: 'DEPLETED', errorMessageFa: 'ظرفیت استفاده از این کد تخفیف تکمیل شده است' };
    }

    // 2. Per-customer usage limit
    const perCustomerLimit = discount.maxUsesPerCustomer ?? 1;
    const customerUsage = context.customerUsageCount ?? 0;
    if (customerUsage >= perCustomerLimit) {
      return {
        eligible: false,
        errorCode: 'LIMIT_REACHED',
        errorMessageFa: 'شما قبلاً از این کد تخفیف حداکثر دفعات مجاز را استفاده کرده‌اید',
      };
    }

    // 3. Minimum order amount check
    const minOrder = discount.minOrderAmountToman ? BigInt(discount.minOrderAmountToman.toString()) : BigInt(0);
    if (context.subtotalToman < minOrder) {
      return {
        eligible: false,
        errorCode: 'MIN_ORDER_NOT_MET',
        errorMessageFa: `حداقل مبلغ سفارش برای استفاده از این تخفیف ${minOrder.toLocaleString('fa-IR')} تومان است`,
      };
    }

    // 4. Scope checks
    switch (discount.scope) {
      case 'PLATFORM':
        break; // Valid across platform
      case 'MERCHANT':
        if (!discount.merchantId || discount.merchantId !== context.merchantId) {
          return {
            eligible: false,
            errorCode: 'MERCHANT_MISMATCH',
            errorMessageFa: 'این کد تخفیف فقط برای فروشگاه دیگری معتبر است',
          };
        }
        break;
      case 'CATEGORY':
        if (!discount.categoryId || discount.categoryId !== context.categoryId) {
          return {
            eligible: false,
            errorCode: 'INVALID_SCOPE',
            errorMessageFa: 'این کد تخفیف فقط برای دسته‌بندی مشخصی معتبر است',
          };
        }
        break;
      case 'LISTING':
        if (!discount.listingId || discount.listingId !== context.listingId) {
          return {
            eligible: false,
            errorCode: 'INVALID_SCOPE',
            errorMessageFa: 'این کد تخفیف فقط برای بسته دیگری معتبر است',
          };
        }
        break;
    }

    return { eligible: true };
  }

  /**
   * Calculates exact discount amount in Toman using integer BigInt arithmetic
   * Guarantees result is non-negative and does not exceed subtotal.
   */
  static calculateDiscountAmount(
    discount: Pick<DiscountEntityLike, 'discountType' | 'discountPercent' | 'discountAmountToman' | 'maxDiscountAmountToman'>,
    subtotalToman: bigint
  ): bigint {
    if (subtotalToman <= BigInt(0)) {
      return BigInt(0);
    }

    let calculatedDiscount = BigInt(0);

    if (discount.discountType === 'PERCENTAGE') {
      let percentNum = 0;
      if (typeof discount.discountPercent === 'number') {
        percentNum = discount.discountPercent;
      } else if (discount.discountPercent && typeof (discount.discountPercent as { toNumber?: () => number }).toNumber === 'function') {
        percentNum = (discount.discountPercent as { toNumber: () => number }).toNumber();
      } else if (discount.discountPercent) {
        percentNum = Number(discount.discountPercent);
      }

      if (percentNum > 0 && Number.isFinite(percentNum)) {
        // Basis points (e.g., 25% * 100 = 2500 basis points)
        const basisPoints = BigInt(Math.round(percentNum * 100));
        calculatedDiscount = (subtotalToman * basisPoints + BigInt(5000)) / BigInt(10000);

        // Apply maximum discount cap if set
        if (discount.maxDiscountAmountToman !== null && discount.maxDiscountAmountToman !== undefined) {
          const maxCap = BigInt(discount.maxDiscountAmountToman.toString());
          if (maxCap > BigInt(0) && calculatedDiscount > maxCap) {
            calculatedDiscount = maxCap;
          }
        }
      }
    } else if (discount.discountType === 'FIXED_AMOUNT') {
      if (discount.discountAmountToman !== null && discount.discountAmountToman !== undefined) {
        calculatedDiscount = BigInt(discount.discountAmountToman.toString());
      }
    }

    // Discount cannot be negative
    if (calculatedDiscount < BigInt(0)) {
      calculatedDiscount = BigInt(0);
    }

    // Discount cannot exceed subtotal
    if (calculatedDiscount > subtotalToman) {
      calculatedDiscount = subtotalToman;
    }

    return calculatedDiscount;
  }
}
