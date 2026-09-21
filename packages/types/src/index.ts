/**
 * @loqme/types — Shared Domain Contracts & Types for Loqme
 * Platform-neutral, universal types consumed by Web, Mobile, and Backend
 */

export * from './business';

// ==========================================
// 1. Roles & Permissions (RBAC)
// ==========================================

export type UserRole = 'CUSTOMER' | 'MERCHANT_STAFF' | 'MERCHANT_OWNER' | 'ADMIN';

export interface AdminMerchantAccountDto {
  id: string;
  businessNameFa: string;
  verificationStatus: string;
  owner: { id: string; mobile: string; fullName: string; role: UserRole; isActive: boolean; ownedStoreCount: number };
  staff: Array<{ id: string; mobile: string; fullName: string; role: string; isActive: boolean }>;
  orders: Array<{ id: string; orderNumber: string; status: string; createdAt: string; customerName: string; totalAmountToman: number; items: Array<{ titleFa: string; quantity: number }> }>;
  totalOrders: number;
  page: number;
  pageSize: number;
}

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
  if (path === '/merchant' || path.startsWith('/merchant/')) {
    if (!role) return false;
    return role === 'MERCHANT_STAFF' || role === 'MERCHANT_OWNER';
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
  defaultPickupStart: string | null;
  defaultPickupEnd: string | null;
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

export type ListingAvailability = 'AVAILABLE' | 'RESERVED' | 'SOLD_OUT' | 'EXPIRED' | 'UNAVAILABLE';

export interface ListingSummaryDto {
  availability?: ListingAvailability;
  canReserve?: boolean;
  cityNameFa?: string;
  neighborhoodNameFa?: string;
  neighborhoodSlug?: string;
  imageUrl?: string | null;
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
  hasReview?: boolean;
  complaintCount?: number;
}

// ==========================================
// 9. Milestone M05: Pickup Verification
// ==========================================

export interface PickupVerificationEntity {
  id: string;
  orderId: string;
  qrCodeHash?: string | null;
  otpCode: string;
  isVerified: boolean;
  verifiedAt?: Date | string | null;
  verifiedByUserId?: string | null;
  verifiedByStaffId?: string | null;
  attemptCount: number;
  lockedUntil?: Date | string | null;
  reminderSentAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CustomerPickupCredentialsDto {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  otpCode: string;
  otpCodePersian: string;
  qrToken: string;
  qrSvg?: string;
  qrDataUrl?: string;
  expiresInSeconds: number; // Duration until dynamic token refresh
  isVerified: boolean;
  verifiedAt?: string | null;
  pickupWindowFa: string;
  pickupStartIso: string;
  pickupEndIso: string;
  isPastPickupEnd: boolean;
  listingTitleFa: string;
  quantity: number;
  totalAmountToman: number;
  merchant: {
    id: string;
    businessNameFa: string;
    addressFa?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    directionsUrl?: string;
  };
}

export interface VerifyPickupInputDto {
  qrToken?: string;
  otpCode?: string;
  orderNumber?: string;
  orderId?: string;
}

export interface VerifyPickupResponseDto {
  success: boolean;
  message: string;
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  verifiedAt: string;
  customerNameFa: string;
  listingTitleFa: string;
  quantity: number;
  totalAmountToman: number;
  alreadyVerified?: boolean;
}

export interface MerchantPickupQueueItemDto {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  customerNameFa: string;
  customerMobileMasked: string;
  listingTitleFa: string;
  quantity: number;
  totalAmountToman: number;
  pickupWindowFa: string;
  pickupStartIso: string;
  pickupEndIso: string;
  isPastPickupEnd: boolean;
  otpCode: string;
  isVerified: boolean;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface NoShowSweepResultDto {
  success: boolean;
  sweptCount: number;
  orderIds: string[];
}

// ==========================================
// 10. Milestone M06: Trust, Safety & Moderation
// ==========================================

export type ComplaintCategory =
  | 'EXPIRED_FOOD'
  | 'SPOILED_FOOD'
  | 'MISMATCHED_DESCRIPTION'
  | 'POOR_HYGIENE'
  | 'STORE_CLOSED'
  | 'MISSING_ITEMS'
  | 'OTHER'
  | 'VALUE_DEFICIT'
  | 'WRONG_ITEMS';

export type ComplaintStatus =
  | 'PENDING'
  | 'INVESTIGATING'
  | 'RESOLVED_REFUNDED'
  | 'RESOLVED_REJECTED'
  | 'RESOLVED_WARNING'
  | 'OPEN'
  | 'RESOLVED_REFUND'
  | 'DISMISSED';

export interface ReviewEntity {
  id: string;
  orderId: string;
  customerId: string;
  merchantId: string;
  overallRating: number;
  qualityRating: number | null;
  valueRating: number | null;
  collectionRating: number | null;
  varietyRating: number | null;
  quantityRating: number | null;
  ratingScore?: number;
  foodQualityScore?: number;
  valueScore?: number;
  commentFa?: string | null;
  isPublic?: boolean;
  merchantReplyFa?: string | null;
  merchantReplyAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ComplaintEntity {
  id: string;
  orderId: string;
  customerId: string;
  merchantId: string;
  category: ComplaintCategory;
  descriptionFa: string;
  evidencePhotos?: string[];
  evidenceImageUrls?: string[];
  status: ComplaintStatus;
  adminNotesFa?: string | null;
  resolvedAt?: Date | string | null;
  resolvedByUserId?: string | null;
  refundId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuditLogEntity {
  id: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detailsJson?: any;
  ipAddress?: string | null;
  createdAt: Date | string;
}

export interface CreateReviewInputDto {
  orderId: string;
  overallRating?: number;
  qualityRating?: number;
  valueRating?: number;
  collectionRating?: number;
  varietyRating?: number;
  quantityRating?: number;
  ratingScore?: number;
  foodQualityScore?: number;
  valueScore?: number;
  commentFa?: string;
}

export interface ReviewSummaryDto {
  id: string;
  orderId: string;
  orderNumber: string;
  customerNameFa: string;
  overallRating: number;
  qualityRating: number | null;
  valueRating: number | null;
  collectionRating: number | null;
  varietyRating: number | null;
  quantityRating: number | null;
  commentFa?: string | null;
  merchantReplyFa?: string | null;
  merchantReplyAt?: string | null;
  createdAt: string;
  verifiedBuyer: boolean;
}

export interface RatingStatisticDto {
  average: number | null;
  count: number;
}

export interface MerchantRatingSummaryDto {
  overallRating: RatingStatisticDto;
  collectionRating: RatingStatisticDto;
  qualityRating: RatingStatisticDto;
  varietyRating: RatingStatisticDto;
  quantityRating: RatingStatisticDto;
}

export interface MerchantReplyReviewDto {
  replyFa: string;
}

export interface CreateComplaintInputDto {
  orderId: string;
  category: ComplaintCategory;
  descriptionFa: string;
  evidencePhotos?: string[];
  evidenceImageUrls?: string[];
}

export interface ComplaintSummaryDto {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerNameFa: string;
  customerMobile: string;
  merchantId: string;
  merchantNameFa: string;
  category: ComplaintCategory;
  descriptionFa: string;
  evidencePhotos?: string[];
  evidenceImageUrls?: string[];
  status: ComplaintStatus;
  adminNotesFa?: string | null;
  resolvedAt?: string | null;
  refundAmountToman?: number | null;
  createdAt: string;
}

export interface ResolveComplaintInputDto {
  action?: 'REFUND' | 'REJECT' | 'WARNING';
  status?: ComplaintStatus;
  notesFa?: string;
  adminNotesFa?: string;
  authorizeRefund?: boolean;
  refundAmountToman?: number;
}

export interface AuditLogItemDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorRole?: string | null;
  detailsJson?: any;
  ipAddress?: string | null;
  createdAt: string;
}

// ==========================================
// 10. Merchant Product & Portal (Milestone M07)
// ==========================================

export interface MerchantDashboardDto {
  merchantId: string;
  businessNameFa: string;
  verificationStatus: string;
  activeListingsCount: number;
  reservedBagsCount: number;
  soldTodayCount: number;
  pendingPickupsCount: number;
  grossRevenueTodayToman: number;
  netPayoutTodayToman: number;
  ratingAverage: number;
  ratingCount: number;
  nextPickupWindow?: {
    start: string;
    end: string;
    labelFa: string;
    startsInMinutes: number;
  } | null;
}

export interface QuickListingTemplateDto {
  id: string;
  categorySlug: string;
  titleFa: string;
  descriptionFa: string;
  defaultOriginalPriceToman: number;
  defaultDiscountedPriceToman: number;
  defaultQuantity: number;
  storageInstructionsFa?: string;
  temperatureRequirement: string;
  allergens: string[];
  dietaryTags: string[];
}

export interface FastCreateListingDto {
  categoryId?: string;
  categorySlug?: string;
  titleFa: string;
  descriptionFa: string;
  originalPriceToman: number;
  discountedPriceToman: number;
  quantity: number;
  pickupDate?: string;
  pickupStart?: string;
  pickupEnd?: string;
  allergens?: string[];
  dietaryTags?: string[];
  storageInstructionsFa?: string;
  temperatureRequirement?: string;
}

export interface UpdateListingStockDto {
  deltaQuantity?: number;
  totalQuantity?: number;
  status?: 'PUBLISHED' | 'PAUSED' | 'SOLD_OUT' | 'ARCHIVED';
}

export interface MerchantStaffMemberDto {
  id: string;
  userId: string;
  mobile: string;
  fullName: string | null;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  canScanPickup: boolean;
  createdAt: string;
}

export interface CreateStaffInputDto {
  mobile: string;
  fullName?: string;
  role: 'MANAGER' | 'CASHIER';
  canScanPickup?: boolean;
}

export interface OperatingHoursDayDto {
  dayOfWeek: number; // 0 = Saturday, ..., 6 = Friday
  dayNameFa: string;
  isOpen: boolean;
  storeOpenTime: string;
  storeCloseTime: string;
  defaultPickupStart: string | null;
  defaultPickupEnd: string | null;
}

export interface MerchantStoreSettingsDto {
  id: string;
  businessNameFa: string;
  businessType: string;
  licenseNumber: string | null;
  commissionPercent: number;
  verificationStatus: string;
  ratingAverage: number;
  ratingCount: number;
  primaryLocation: {
    id: string;
    addressFa: string;
    phone: string | null;
    postalCode: string | null;
    latitude: number;
    longitude: number;
    cityId: string;
    cityNameFa?: string;
  } | null;
  hours: OperatingHoursDayDto[];
}

export interface UpdateStoreSettingsDto {
  businessNameFa?: string;
  phone?: string;
  addressFa?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  hours?: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    storeOpenTime: string;
    storeCloseTime: string;
    defaultPickupStart: string | null;
    defaultPickupEnd: string | null;
  }>;
}

export interface MerchantFinanceSummaryDto {
  merchantId: string;
  businessNameFa: string;
  commissionPercent: number;
  grossSalesToman: number;
  platformCommissionToman: number;
  netPayableBalanceToman: number;
  totalOrdersCount: number;
  completedOrdersCount: number;
  shabaNumber?: string | null;
  isBankVerified?: boolean;
  transactions: MerchantLedgerEntryDto[];
}

export interface MerchantLedgerEntryDto {
  id: string;
  orderId?: string | null;
  orderNumber?: string | null;
  type: string;
  descriptionFa: string;
  grossAmountToman: number;
  commissionAmountToman: number;
  netAmountToman: number;
  createdAt: string;
}

// ==========================================
// 11. Admin Platform Operations (Milestone M08)
// ==========================================

export interface AdminDashboardKpiDto {
  activeMerchantsCount: number;
  pendingMerchantsCount: number;
  suspendedMerchantsCount: number;
  activeListingsCount: number;
  totalOrders24hCount: number;
  gmv24hToman: number;
  commission24hToman: number;
  openComplaintsCount: number;
  systemHealth: {
    database: boolean;
    auth: boolean;
    rbac: boolean;
  };
}

export interface AdminMerchantItemDto {
  id: string;
  businessNameFa: string;
  businessType: string;
  ownerMobile: string;
  ownerFullName?: string | null;
  licenseNumber: string | null;
  commissionPercent: number;
  verificationStatus: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  ratingAverage: number;
  ratingCount: number;
  addressFa?: string;
  cityNameFa?: string;
  activeListingsCount: number;
  totalOrdersCount: number;
  createdAt: string;
}

export interface AdminUpdateMerchantDto {
  verificationStatus?: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  commissionPercent?: number;
  reasonFa?: string;
}

export interface AdminCustomerItemDto {
  id: string;
  userId: string;
  mobile: string;
  fullName: string | null;
  isActive: boolean;
  cumulativeSavingsToman: number;
  totalOrdersCount: number;
  complaintsCount: number;
  createdAt: string;
}

export interface AdminListingItemDto {
  id: string;
  merchantId: string;
  merchantNameFa: string;
  categoryId: string;
  categoryNameFa?: string;
  titleFa: string;
  originalPriceToman: number;
  discountedPriceToman: number;
  quantity: number;
  status: string;
  safetyStatus: string;
  pickupStart: string | null;
  pickupEnd: string | null;
  createdAt: string;
}

export interface AdminCategoryDto {
  id: string;
  slug: string;
  nameFa: string;
  iconUrl?: string | null;
  parentId?: string | null;
  listingsCount: number;
  createdAt: string;
}

export interface CreateCategoryInputDto {
  slug: string;
  nameFa: string;
  iconUrl?: string;
  parentId?: string;
}

export interface MerchantSettlementSheetDto {
  merchantId: string;
  businessNameFa: string;
  commissionPercent: number;
  grossGmvToman: number;
  commissionCutToman: number;
  refundsDeductedToman: number;
  netPayableToman: number;
  shabaNumber: string;
  ordersCount: number;
}

export interface AdminSettlementReportDto {
  generatedAt: string;
  totalGmvToman: number;
  totalPlatformCommissionToman: number;
  totalRefundsToman: number;
  totalNetPayableToman: number;
  merchants: MerchantSettlementSheetDto[];
}

export interface SystemSettingsDto {
  maintenanceMode: boolean;
  announcementBannerFa: string;
  activeSmsProvider: 'MOCK' | 'KAVENEGAR' | 'FARAZSMS';
}

// =============================================================================
// Milestone M09 — Marketplace Analytics Contracts & DTOs
// =============================================================================

export type AnalyticsTimeframe = 'TODAY' | '7D' | '30D' | '90D' | '1Y' | 'CUSTOM';

export interface MarketplaceAnalyticsKpiDto {
  gmvToman: number;
  platformCommissionToman: number;
  averageOrderValueToman: number;
  totalOrdersCount: number;
  totalBagsSold: number;
  customerCumulativeSavingsToman: number;
  merchantNetPayoutToman: number;
  sellThroughRate: number;
  pickupCompletionRate: number;
  refundRate: number;
  repeatCustomerRate: number;
}

export interface DailyAnalyticsTrendPointDto {
  dateIso: string;
  dateFa: string;
  gmvToman: number;
  ordersCount: number;
  commissionToman: number;
  soldBags: number;
}

export interface CategoryDistributionDto {
  categoryId: string;
  categoryNameFa: string;
  listingsCount: number;
  soldBagsCount: number;
  gmvToman: number;
  percentage: number;
}

export interface NeighborhoodDensityDto {
  neighborhoodId: string;
  neighborhoodNameFa: string;
  cityNameFa: string;
  activeMerchantsCount: number;
  activeListingsCount: number;
  totalOrdersCount: number;
  totalGmvToman: number;
  unmetDemandScore: number;
}

export interface CustomerCohortAnalyticsDto {
  totalCustomers: number;
  activeOrderingCustomers: number;
  repeatCustomers: number;
  repeatRate14Days: number;
  repeatRate30Days: number;
}

export interface MarketplaceAnalyticsReportDto {
  timeframe: AnalyticsTimeframe;
  startDateIso: string;
  endDateIso: string;
  kpis: MarketplaceAnalyticsKpiDto;
  dailyTrends: DailyAnalyticsTrendPointDto[];
  categoryDistribution: CategoryDistributionDto[];
  neighborhoodDensity: NeighborhoodDensityDto[];
  cohorts: CustomerCohortAnalyticsDto;
}

