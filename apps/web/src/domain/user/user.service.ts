import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/auth/rbac';
import { UserRecord } from './user.types';

// In-memory fallback repository for dev/offline testing if database is offline
const inMemoryUsers = new Map<string, UserRecord>([
  [
    '09121111111',
    {
      id: 'demo-customer-uuid-1',
      mobile: '09121111111',
      role: 'CUSTOMER',
      isActive: true,
      fullName: 'سارا محمدی',
      createdAt: new Date(),
    },
  ],
  [
    '09122222222',
    {
      id: 'demo-merchant-uuid-2',
      mobile: '09122222222',
      role: 'MERCHANT_OWNER',
      isActive: true,
      fullName: 'علی رضایی',
      createdAt: new Date(),
    },
  ],
  [
    '09123333333',
    {
      id: 'demo-admin-uuid-3',
      mobile: '09123333333',
      role: 'ADMIN',
      isActive: true,
      fullName: 'مدیر سامانه لقمه',
      createdAt: new Date(),
    },
  ],
]);

export class UserService {
  /**
   * Finds user by Iranian mobile number
   */
  async findByMobile(mobile: string): Promise<UserRecord | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { mobile },
        include: { customer: true },
      });

      if (!user) return null;

      return {
        id: user.id,
        mobile: user.mobile,
        role: user.role as UserRole,
        isActive: user.isActive,
        fullName: user.customer?.fullName ?? null,
        createdAt: user.createdAt,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
      console.warn('⚠️ DB query failed, checking in-memory user cache:', error);
      return inMemoryUsers.get(mobile) ?? null;
    }
  }

  /**
   * Finds or creates a user with CUSTOMER role
   */
  async findOrCreateCustomer(mobile: string): Promise<UserRecord> {
    try {
      const existing = await this.findByMobile(mobile);
      if (existing) return existing;

      const newUser = await prisma.user.create({
        data: {
          mobile,
          role: 'CUSTOMER',
          customer: {
            create: {
              fullName: `کاربر ${mobile.slice(-4)}`,
            },
          },
        },
        include: { customer: true },
      });

      return {
        id: newUser.id,
        mobile: newUser.mobile,
        role: newUser.role as UserRole,
        isActive: newUser.isActive,
        fullName: newUser.customer?.fullName ?? null,
        createdAt: newUser.createdAt,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
      // Fallback for offline dev
      let user = inMemoryUsers.get(mobile);
      if (!user) {
        user = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          mobile,
          role: 'CUSTOMER',
          isActive: true,
          fullName: `کاربر ${mobile.slice(-4)}`,
          createdAt: new Date(),
        };
        inMemoryUsers.set(mobile, user);
      }
      return user;
    }
  }
}

export const userService = new UserService();
