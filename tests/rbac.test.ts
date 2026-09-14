import { describe, it, expect } from 'vitest';
import { canAccessPath, hasMinimumRole, UserRole } from '@/lib/auth/rbac';

describe('Role-Based Access Control (RBAC)', () => {
  it('allows public routes to unauthenticated and any role', () => {
    const publicPaths = ['/', '/login', '/explore', '/api/auth/request-otp'];

    for (const path of publicPaths) {
      expect(canAccessPath(null, path)).toBe(true);
      expect(canAccessPath('CUSTOMER', path)).toBe(true);
      expect(canAccessPath('MERCHANT_STAFF', path)).toBe(true);
      expect(canAccessPath('ADMIN', path)).toBe(true);
    }
  });

  it('restricts /merchant routes to merchant staff and owners, not admins', () => {
    const merchantPath = '/merchant/orders';

    // Unauthenticated
    expect(canAccessPath(null, merchantPath)).toBe(false);

    // Customer
    expect(canAccessPath('CUSTOMER', merchantPath)).toBe(false);

    // Merchant Staff & Owner
    expect(canAccessPath('MERCHANT_STAFF', merchantPath)).toBe(true);
    expect(canAccessPath('MERCHANT_OWNER', merchantPath)).toBe(true);

    // Admin
    expect(canAccessPath('ADMIN', merchantPath)).toBe(false);
  });

  it('strictly restricts /admin routes to ADMIN role only', () => {
    const adminPath = '/admin/merchants';

    // Unauthenticated
    expect(canAccessPath(null, adminPath)).toBe(false);

    // Customer & Merchant
    expect(canAccessPath('CUSTOMER', adminPath)).toBe(false);
    expect(canAccessPath('MERCHANT_STAFF', adminPath)).toBe(false);
    expect(canAccessPath('MERCHANT_OWNER', adminPath)).toBe(false);

    // Admin
    expect(canAccessPath('ADMIN', adminPath)).toBe(true);
  });

  it('checks hierarchy relationships correctly', () => {
    expect(hasMinimumRole('ADMIN', 'CUSTOMER')).toBe(true);
    expect(hasMinimumRole('ADMIN', 'MERCHANT_OWNER')).toBe(true);
    expect(hasMinimumRole('MERCHANT_OWNER', 'MERCHANT_STAFF')).toBe(true);
    expect(hasMinimumRole('CUSTOMER', 'MERCHANT_STAFF')).toBe(false);
  });
});
