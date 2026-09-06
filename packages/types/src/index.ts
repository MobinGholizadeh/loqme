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
// 5. Core Marketplace Domain (M02–M06 preview)
// ==========================================

export type MerchantCategory =
  | 'BAKERY'
  | 'CAFE'
  | 'RESTAURANT'
  | 'SUPERMARKET'
  | 'CONFECTIONERY'
  | 'PRODUCE';

export type ListingType = 'SURPRISE_BAG' | 'FLASH_DEAL';

export type ListingStatus = 'ACTIVE' | 'SOLD_OUT' | 'EXPIRED' | 'CANCELLED';

export type FoodSafetyStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'RESTRICTED'
  | 'UNSAFE';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'RESERVED'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export interface PickupWindow {
  startTime: string; // ISO 8601 or HH:mm
  endTime: string;
  pickupDate: string; // Jalali or YYYY-MM-DD
}
