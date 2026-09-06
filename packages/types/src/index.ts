/**
 * @loqme/types — Shared Domain Contracts & Types for Loqme
 * Platform-neutral, universal types consumed by Web, Mobile, and Backend
 */

// ==========================================
// 1. Roles & Permissions (RBAC)
// ==========================================

export type UserRole = 'CUSTOMER' | 'MERCHANT_STAFF' | 'MERCHANT_OWNER' | 'ADMIN';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  CUSTOMER: 1,
  MERCHANT_STAFF: 2,
  MERCHANT_OWNER: 3,
  ADMIN: 4,
};

/**
 * Checks if a given user role has access to a protected path
 */
export function canAccessPath(role: UserRole | null | undefined, path: string): boolean {
  // Public paths
  if (
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/explore') ||
    path.startsWith('/api/auth')
  ) {
    return true;
  }

  // If path is merchant portal
  if (path.startsWith('/merchant')) {
    if (!role) return false;
    return role === 'MERCHANT_STAFF' || role === 'MERCHANT_OWNER' || role === 'ADMIN';
  }

  // If path is admin console
  if (path.startsWith('/admin')) {
    if (!role) return false;
    return role === 'ADMIN';
  }

  // Other protected customer routes (orders, profile) require at least being logged in
  return !!role;
}

/**
 * Returns true if role A has equal or greater hierarchy privilege than role B
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ==========================================
// 2. Auth & Session Types
// ==========================================

export interface SessionPayload {
  userId: string;
  mobile: string;
  role: UserRole;
  fullName?: string | null;
}

export interface UserRecord {
  id: string;
  mobile: string;
  role: UserRole;
  isActive: boolean;
  fullName?: string | null;
  createdAt: Date | string;
}

export interface OtpRecord {
  mobile: string;
  codeHash: string;
  expiresAt: Date | string;
  attempts: number;
}

export interface RequestOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  mobile: string;
  cooldownSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    mobile: string;
    role: UserRole;
    fullName?: string | null;
  };
  token?: string;
}

// ==========================================
// 3. API Contract Wrappers
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==========================================
// 4. Geospatial & Location
// ==========================================

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface StoreAddress {
  formattedAddress: string;
  city: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
}

// ==========================================
// 5. Core Marketplace Domain (M02)
// ==========================================

export type MerchantCategory =
  | 'BAKERY'
  | 'CAFE'
  | 'RESTAURANT'
  | 'SUPERMARKET'
  | 'CONFECTIONERY'
  | 'PRODUCE';

export type ListingType = 'SURPRISE_BAG' | 'FLASH_DEAL';

export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'SOLD_OUT' | 'EXPIRED';

export type FoodSafetyStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'RESTRICTED'
  | 'REJECTED'
  | 'UNSAFE'
  | 'EXPIRED';

export type TemperatureRequirement = 'ROOM_TEMP' | 'CHILLED' | 'FROZEN';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'NO_SHOW';

export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PickupWindow {
  startTime: string; // HH:mm or ISO 8601
  endTime: string;
  pickupDate: string; // Jalali or YYYY-MM-DD
}

// ------------------------------------------
// Domain Entity Interfaces
// ------------------------------------------

export interface ProvinceEntity {
  id: string;
  nameFa: string;
  slug: string;
}

export interface CityEntity {
  id: string;
  provinceId: string;
  nameFa: string;
  slug: string;
}

export interface NeighborhoodEntity {
  id: string;
  cityId: string;
  nameFa: string;
  slug: string;
  centerLat: number;
  centerLng: number;
}

export interface MerchantHoursEntity {
  id: string;
  merchantLocationId: string;
  dayOfWeek: number;
  isOpen: boolean;
  storeOpenTime: string;
  storeCloseTime: string;
  defaultPickupStart: string;
  defaultPickupEnd: string;
}

export interface MerchantLocationEntity {
  id: string;
  merchantId: string;
  cityId: string;
  neighborhoodId?: string | null;
  addressFa: string;
  postalCode?: string | null;
  latitude: number;
  longitude: number;
  phone?: string | null;
  distanceMeters?: number;
  city?: CityEntity;
  neighborhood?: NeighborhoodEntity | null;
  hours?: MerchantHoursEntity[];
}

export interface MerchantEntity {
  id: string;
  ownerUserId: string;
  businessNameFa: string;
  businessType: string;
  licenseNumber?: string | null;
  verificationStatus: string;
  commissionPercent: number;
  ratingAverage: number;
  ratingCount: number;
  locations?: MerchantLocationEntity[];
  createdAt: Date | string;
}

export interface CategoryEntity {
  id: string;
  slug: string;
  nameFa: string;
  iconUrl?: string | null;
  parentId?: string | null;
  children?: CategoryEntity[];
}

export interface ListingInventoryEntity {
  id: string;
  listingId: string;
  totalQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  availableQuantity: number;
  version: number;
}

export interface ListingSafetyEntity {
  id: string;
  listingId: string;
  safetyStatus: FoodSafetyStatus;
  allergens: string[];
  dietaryTags: string[];
  storageInstructionsFa?: string | null;
  temperatureRequirement: TemperatureRequirement;
}

export interface ListingEntity {
  id: string;
  merchantId: string;
  merchantLocationId?: string | null;
  categoryId: string;
  type: ListingType;
  titleFa: string;
  descriptionFa?: string | null;
  originalPriceToman: bigint | number;
  discountedPriceToman: bigint | number;
  discountPercentage: number;
  pickupDate: Date | string;
  pickupStart: Date | string;
  pickupEnd: Date | string;
  status: ListingStatus;
  category?: CategoryEntity;
  merchant?: MerchantEntity;
  location?: MerchantLocationEntity | null;
  inventory?: ListingInventoryEntity | null;
  safety?: ListingSafetyEntity | null;
  createdAt: Date | string;
}

export interface NearbyMerchantQuery {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  limit?: number;
  businessType?: string;
}

export interface FavoriteEntity {
  id: string;
  customerId: string;
  merchantId: string;
  createdAt: Date | string;
  merchant?: MerchantEntity;
}

export interface StoreMapPin {
  id: string;
  merchantId: string;
  businessNameFa: string;
  businessType: string;
  latitude: number;
  longitude: number;
  addressFa: string;
  activeListingCount: number;
  minPriceToman?: number;
  ratingAverage: number;
}

export interface MarketplaceFilterParams {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  cityId?: string;
  neighborhoodId?: string;
  categoryId?: string;
  businessType?: string;
  minDiscountPercent?: number;
  maxPriceToman?: number;
  dietaryTag?: string;
  searchQuery?: string;
}

export interface ListingSummaryDto {
  id: string;
  merchantId: string;
  storeNameFa: string;
  businessType: string;
  categoryNameFa: string;
  categorySlug: string;
  titleFa: string;
  descriptionFa?: string | null;
  originalPriceToman: number;
  discountedPriceToman: number;
  discountPercent: number;
  remainingQuantity: number;
  pickupWindowFa: string;
  pickupEndIso: string;
  distanceMeters?: number;
  safetyVerified: boolean;
  latitude?: number;
  longitude?: number;
  addressFa?: string;
  type: ListingType;
}

// ==========================================
// 8. Milestone M04: Orders, Inventory & Payments
// ==========================================

export type ReservationStatus = 'PENDING' | 'CONVERTED_TO_ORDER' | 'EXPIRED' | 'RELEASED';

export type PaymentGatewayType = 'MOCK' | 'ZARINPAL' | 'SAMAN' | 'SADAD';

export type FinancialTransactionType =
  | 'CUSTOMER_PAYMENT'
  | 'COMMISSION_EARNED'
  | 'MERCHANT_PAYOUT'
  | 'CUSTOMER_REFUND';

export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'SETTLED' | 'REJECTED';

export interface ReservationEntity {
  id: string;
  listingId: string;
  customerId: string;
  quantity: number;
  expiresAt: Date | string;
  status: ReservationStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  listing?: ListingEntity;
}

export interface OrderItemEntity {
  id: string;
  orderId: string;
  listingId: string;
  unitPriceToman: number;
  quantity: number;
  subtotalToman: number;
  createdAt: Date | string;
  listing?: ListingEntity;
}

export interface OrderEntity {
  id: string;
  orderNumber: string;
  customerId: string;
  merchantId: string;
  reservationId?: string | null;
  status: OrderStatus;
  totalAmountToman: number;
  commissionPercent: number;
  commissionAmountToman: number;
  merchantPayoutAmountToman: number;
  notesFa?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: OrderItemEntity[];
  merchant?: MerchantEntity;
  payments?: PaymentEntity[];
}

export interface PaymentEntity {
  id: string;
  orderId: string;
  gateway: PaymentGatewayType;
  authority: string;
  trackingCode?: string | null;
  referenceId?: string | null;
  amountToman: number;
  status: PaymentStatus;
  errorMessage?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FinancialTransactionEntity {
  id: string;
  orderId?: string | null;
  type: FinancialTransactionType;
  debitAccount: string;
  creditAccount: string;
  amountToman: number;
  referenceNumber?: string | null;
  createdAt: Date | string;
}

export interface CreateReservationInputDto {
  listingId: string;
  quantity?: number;
}

export interface ReservationResponseDto {
  id: string;
  listingId: string;
  quantity: number;
  expiresAt: string;
  remainingSeconds: number;
  status: ReservationStatus;
  listing: {
    id: string;
    titleFa: string;
    storeNameFa: string;
    addressFa?: string;
    discountedPriceToman: number;
    originalPriceToman: number;
    pickupWindowFa: string;
    pickupEndIso: string;
  };
}

export interface CheckoutOrderInputDto {
  reservationId: string;
  gateway?: PaymentGatewayType;
  notesFa?: string;
}

export interface CheckoutOrderResponseDto {
  orderId: string;
  orderNumber: string;
  totalAmountToman: number;
  paymentUrl: string;
  authority: string;
  gateway: PaymentGatewayType;
}

export interface PaymentVerifyInputDto {
  authority: string;
  status?: string; // 'OK' | 'NOK' (Zarinpal standard)
  trackingCode?: string;
}

export interface PaymentVerifyResponseDto {
  success: boolean;
  message: string;
  orderId: string;
  orderNumber: string;
  referenceId?: string;
  amountToman: number;
  status: OrderStatus;
}

export interface CustomerOrderSummaryDto {
  id: string;
  orderNumber: string;
  merchantId: string;
  merchantNameFa: string;
  merchantAddressFa: string;
  listingTitleFa: string;
  quantity: number;
  totalAmountToman: number;
  status: OrderStatus;
  pickupWindowFa: string;
  pickupEndIso: string;
  createdAt: string;
}


