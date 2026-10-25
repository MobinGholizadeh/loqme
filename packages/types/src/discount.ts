/**
 * @loqme/types — Discount and Promotion types
 */

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type DiscountOwnerType = 'ADMIN' | 'MERCHANT';
export type DiscountScope = 'PLATFORM' | 'MERCHANT' | 'CATEGORY' | 'LISTING';
export type DiscountApplicationMethod = 'COUPON_CODE' | 'AUTOMATIC';
export type DiscountFundingSource = 'PLATFORM' | 'MERCHANT';

export type DiscountOperationalStatus = 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'SCHEDULED' | 'INACTIVE';

export interface DiscountDto {
  id: string;
  code: string | null;
  titleFa: string;
  descriptionFa: string | null;
  ownerType: DiscountOwnerType;
  creatorUserId: string;
  creatorNameFa?: string | null;
  merchantId: string | null;
  merchantNameFa?: string | null;
  discountType: DiscountType;
  discountPercent: number | null;
  discountAmountToman: number | null;
  maxDiscountAmountToman: number | null;
  minOrderAmountToman: number | null;
  applicationMethod: DiscountApplicationMethod;
  scope: DiscountScope;
  categoryId: string | null;
  categoryNameFa?: string | null;
  listingId: string | null;
  listingTitleFa?: string | null;
  startsAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  currentUses: number;
  isCombinable: boolean;
  isActive: boolean;
  fundingSource: DiscountFundingSource;
  metadata?: Record<string, unknown> | null;
  status: DiscountOperationalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountRedemptionDto {
  id: string;
  discountId: string;
  orderId: string;
  orderNumber?: string;
  customerId: string;
  customerNameFa?: string;
  discountAmountToman: number;
  createdAt: string;
}

export interface CreateDiscountInput {
  code?: string | null;
  titleFa: string;
  descriptionFa?: string | null;
  ownerType?: DiscountOwnerType;
  merchantId?: string | null;
  discountType: DiscountType;
  discountPercent?: number | null;
  discountAmountToman?: number | null;
  maxDiscountAmountToman?: number | null;
  minOrderAmountToman?: number | null;
  applicationMethod?: DiscountApplicationMethod;
  scope?: DiscountScope;
  categoryId?: string | null;
  listingId?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  isCombinable?: boolean;
  isActive?: boolean;
  fundingSource?: DiscountFundingSource;
}

export interface UpdateDiscountInput {
  code?: string | null;
  titleFa?: string;
  descriptionFa?: string | null;
  discountType?: DiscountType;
  discountPercent?: number | null;
  discountAmountToman?: number | null;
  maxDiscountAmountToman?: number | null;
  minOrderAmountToman?: number | null;
  applicationMethod?: DiscountApplicationMethod;
  scope?: DiscountScope;
  categoryId?: string | null;
  listingId?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  isCombinable?: boolean;
  isActive?: boolean;
  fundingSource?: DiscountFundingSource;
}

export interface ValidateCouponInput {
  code: string;
  customerId?: string;
  merchantId: string;
  listingId: string;
  subtotalToman: number;
  reservationId?: string;
}

export type DiscountErrorCode =
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'NOT_STARTED'
  | 'DEPLETED'
  | 'LIMIT_REACHED'
  | 'MIN_ORDER_NOT_MET'
  | 'INVALID_SCOPE'
  | 'MERCHANT_MISMATCH'
  | 'INACTIVE'
  | 'ALREADY_USED';

export interface ValidateDiscountResult {
  valid: boolean;
  discount?: DiscountDto;
  discountAmountToman: number;
  finalAmountToman: number;
  errorCode?: DiscountErrorCode;
  errorMessageFa?: string;
}

export interface DiscountStatsDto {
  totalDiscounts: number;
  activeDiscounts: number;
  totalRedemptions: number;
  totalDiscountAmountToman: number;
}

export interface BulkGenerateDiscountsInput {
  prefix?: string | null;
  count: number;
  discountType: DiscountType;
  discountPercent?: number | null;
  discountAmountToman?: number | null;
  maxDiscountAmountToman?: number | null;
  minOrderAmountToman?: number | null;
  titleFa: string;
  descriptionFa?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUsesPerCode?: number | null;
  maxUsesPerCustomer?: number | null;
  scope?: DiscountScope | null;
  merchantId?: string | null;
  categoryId?: string | null;
  listingId?: string | null;
  fundingSource?: DiscountFundingSource | null;
}
