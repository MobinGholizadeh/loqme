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
