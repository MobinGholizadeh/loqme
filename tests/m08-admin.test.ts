import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  AdminUpdateMerchantSchema,
  AdminUpdateCustomerSchema,
  CreateCategorySchema,
  UpdateSystemSettingsSchema,
} from '@loqme/validation';
import { adminService } from '@/domain/admin/admin.service';
import { auditService } from '@/domain/moderation/audit.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { createSessionToken, SessionPayload } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { VerificationStatus, ListingStatus, Role } from '@prisma/client';

describe('Milestone M08 — Admin Operations & Marketplace Governance', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditService, 'logAction').mockResolvedValue({ id: 'mock-audit-id' } as any);
  });

  // =========================================================================
  // 1. Zod Validation & Schema Integrity (CP-08.2, CP-08.3, CP-08.4, CP-08.7)
  // =========================================================================
  describe('1. Zod Validation & Schema Integrity', () => {
    it('validates correct merchant status update with commission rate', () => {
      const validMerchantUpdate = {
        verificationStatus: 'APPROVED' as const,
        commissionPercent: 12.5,
        reasonFa: 'مدارک و پروانه کسب احراز گردید',
      };

      const result = AdminUpdateMerchantSchema.safeParse(validMerchantUpdate);
      expect(result.success).toBe(true);
    });

    it('rejects invalid merchant commission percent (< 0 or > 100)', () => {
      expect(
        AdminUpdateMerchantSchema.safeParse({
          commissionPercent: -5,
        }).success
      ).toBe(false);

      expect(
        AdminUpdateMerchantSchema.safeParse({
          commissionPercent: 105,
        }).success
      ).toBe(false);
    });

    it('rejects invalid merchant verification status', () => {
      expect(
        AdminUpdateMerchantSchema.safeParse({
          verificationStatus: 'SUPER_VERIFIED',
        }).success
      ).toBe(false);
    });

    it('validates customer account status toggle schema', () => {
      const validDeactivate = {
        isActive: false,
        reasonFa: 'تخلف مکرر در لغو سفارش',
      };
      expect(AdminUpdateCustomerSchema.safeParse(validDeactivate).success).toBe(true);

      const invalidInput = {
        isActive: 'not-a-boolean',
      };
      expect(AdminUpdateCustomerSchema.safeParse(invalidInput).success).toBe(false);
    });

    it('validates category creation with kebab-case slug and Persian title', () => {
      const validCategory = {
        slug: 'dairy-products',
        nameFa: 'لبنیات و پنیر محلی',
        iconUrl: '/icons/dairy.svg',
      };

      const result = CreateCategorySchema.safeParse(validCategory);
      expect(result.success).toBe(true);
    });

    it('rejects invalid category slug format (uppercase or spaces)', () => {
      const invalidSlugSpaces = {
        slug: 'dairy products',
        nameFa: 'لبنیات',
      };
      expect(CreateCategorySchema.safeParse(invalidSlugSpaces).success).toBe(false);

      const invalidSlugUpper = {
        slug: 'DairyProducts',
        nameFa: 'لبنیات',
      };
      expect(CreateCategorySchema.safeParse(invalidSlugUpper).success).toBe(false);
    });

    it('validates system settings update schema', () => {
      const validSettings = {
        maintenanceMode: true,
        announcementBannerFa: 'سامانه در حال بروزرسانی سرورهای پرداخت می‌باشد.',
        activeSmsProvider: 'KAVENEGAR' as const,
      };

      const result = UpdateSystemSettingsSchema.safeParse(validSettings);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // 2. Admin RBAC & Route Security (CP-08.8)
  // =========================================================================
  describe('2. Admin RBAC & Route Security', () => {
    it('rejects requests without authentication cookie (401)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/dashboard');
      const authResult = await requireAdminSession(req);

      expect('errorResponse' in authResult).toBe(true);
      if ('errorResponse' in authResult) {
        expect(authResult.errorResponse.status).toBe(401);
      }
    });

    it('rejects requests with invalid or tampered session tokens (401)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/dashboard', {
        headers: {
          cookie: 'loqme_session=corrupted.fake.token',
        },
      });
      const authResult = await requireAdminSession(req);

      expect('errorResponse' in authResult).toBe(true);
      if ('errorResponse' in authResult) {
        expect(authResult.errorResponse.status).toBe(401);
      }
    });

    it('strictly forbids CUSTOMER role from accessing admin endpoints (403)', async () => {
      const customerPayload: SessionPayload = {
        userId: 'usr-customer-123',
        mobile: '09121111111',
        role: 'CUSTOMER',
      };
      const token = await createSessionToken(customerPayload);

      const req = new NextRequest('http://localhost:3000/api/admin/merchants', {
        headers: {
          cookie: `loqme_session=${token}`,
        },
      });

      const authResult = await requireAdminSession(req);
      expect('errorResponse' in authResult).toBe(true);
      if ('errorResponse' in authResult) {
        expect(authResult.errorResponse.status).toBe(403);
      }
    });

    it('strictly forbids MERCHANT_OWNER and MERCHANT_STAFF roles from accessing admin endpoints (403)', async () => {
      const ownerPayload: SessionPayload = {
        userId: 'usr-owner-456',
        mobile: '09122222222',
        role: 'MERCHANT_OWNER',
      };
      const token = await createSessionToken(ownerPayload);

      const req = new NextRequest('http://localhost:3000/api/admin/finance/settlements', {
        headers: {
          cookie: `loqme_session=${token}`,
        },
      });

      const authResult = await requireAdminSession(req);
      expect('errorResponse' in authResult).toBe(true);
      if ('errorResponse' in authResult) {
        expect(authResult.errorResponse.status).toBe(403);
      }
    });

    it('authorizes ADMIN users successfully', async () => {
      const adminPayload: SessionPayload = {
        userId: 'usr-admin-789',
        mobile: '09129999999',
        role: 'ADMIN',
        fullName: 'مدیر کل سامانه',
      };
      const token = await createSessionToken(adminPayload);

      const req = new NextRequest('http://localhost:3000/api/admin/dashboard', {
        headers: {
          cookie: `loqme_session=${token}`,
        },
      });

      const authResult = await requireAdminSession(req);
      expect('session' in authResult).toBe(true);
      if ('session' in authResult) {
        expect(authResult.session.userId).toBe('usr-admin-789');
        expect(authResult.session.role).toBe('ADMIN');
      }
    });
  });

  // =========================================================================
  // 3. Merchant Moderation & Automatic Listing Pausing (CP-08.2, CP-08.8)
  // =========================================================================
  describe('3. Merchant Moderation & Listing Protection', () => {
    it('approves a pending merchant and writes audit log', async () => {
      const mockMerchant = {
        id: 'mch-test-1',
        businessNameFa: 'نانوایی برکت ارومیه',
        verificationStatus: VerificationStatus.PENDING,
        commissionPercent: 10,
      };

      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(mockMerchant as any);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          merchant: {
            update: vi.fn().mockResolvedValue({
              ...mockMerchant,
              verificationStatus: VerificationStatus.APPROVED,
            }),
          },
          listing: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        });
      });

      const result = await adminService.updateMerchant('admin-user-1', 'mch-test-1', {
        verificationStatus: VerificationStatus.APPROVED,
        reasonFa: 'تایید مدارک هویتی و پروانه صنفی',
      });

      expect(result.success).toBe(true);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_UPDATE_MERCHANT',
          entityType: 'MERCHANT',
          entityId: 'mch-test-1',
          actorRole: Role.ADMIN,
        })
      );
    });

    it('automatically pauses active published listings when merchant is suspended', async () => {
      const mockMerchant = {
        id: 'mch-test-2',
        businessNameFa: 'قنادی آذربایجان',
        verificationStatus: VerificationStatus.APPROVED,
        commissionPercent: 10,
      };

      const mockListingUpdateMany = vi.fn().mockResolvedValue({ count: 4 });

      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(mockMerchant as any);
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          merchant: {
            update: vi.fn().mockResolvedValue({
              ...mockMerchant,
              verificationStatus: VerificationStatus.SUSPENDED,
            }),
          },
          listing: {
            updateMany: mockListingUpdateMany,
          },
        });
      });

      const result = await adminService.updateMerchant('admin-user-1', 'mch-test-2', {
        verificationStatus: VerificationStatus.SUSPENDED,
        reasonFa: 'شکایت‌های مکرر عدم رعایت بهداشت',
      });

      expect(result.success).toBe(true);
      expect(mockListingUpdateMany).toHaveBeenCalledWith({
        where: {
          merchantId: 'mch-test-2',
          status: ListingStatus.PUBLISHED,
        },
        data: { status: ListingStatus.PAUSED },
      });
    });

    it('throws error when modifying non-existent merchant', async () => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(null);

      await expect(
        adminService.updateMerchant('admin-user-1', 'mch-unknown', {
          verificationStatus: VerificationStatus.APPROVED,
        })
      ).rejects.toThrow('فروشگاه مورد نظر یافت نشد');
    });
  });

  // =========================================================================
  // 4. Customer Management & Status Toggling (CP-08.3)
  // =========================================================================
  describe('4. Customer Management & Status Toggling', () => {
    it('deactivates customer account and logs administrative audit', async () => {
      const mockUser = {
        id: 'usr-customer-99',
        mobile: '09141112233',
        isActive: true,
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);

      const result = await adminService.updateCustomerStatus('admin-user-1', 'usr-customer-99', {
        isActive: false,
        reasonFa: 'ثبت شکایات فریبنده',
      });

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr-customer-99' },
        data: { isActive: false },
      });
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_UPDATE_CUSTOMER_STATUS',
          entityType: 'USER',
          entityId: 'usr-customer-99',
          actorRole: Role.ADMIN,
        })
      );
    });
  });

  // =========================================================================
  // 5. Settlement Engine & Mathematical Correctness (CP-08.6)
  // =========================================================================
  describe('5. Settlement Engine & Financial Accuracy', () => {
    it('calculates marketplace GMV, commission cut, refunds and net payables accurately', async () => {
      const mockMerchants = [
        {
          id: 'mch-1',
          businessNameFa: 'کافه هنر ارومیه',
          commissionPercent: 10,
          orders: [
            {
              id: 'ord-1',
              totalAmountToman: 100000,
              refunds: [],
            },
            {
              id: 'ord-2',
              totalAmountToman: 50000,
              refunds: [{ amountToman: 20000 }],
            },
          ],
        },
        {
          id: 'mch-2',
          businessNameFa: 'سوپرمارکت بهار',
          commissionPercent: 15,
          orders: [
            {
              id: 'ord-3',
              totalAmountToman: 200000,
              refunds: [],
            },
          ],
        },
      ];

      vi.spyOn(prisma.merchant, 'findMany').mockResolvedValue(mockMerchants as any);

      const report = await adminService.getSettlementReport();

      // Merchant 1:
      // GMV = 150,000
      // Commission (10%) = 15,000
      // Refunds = 20,000
      // Net Payable = 150,000 - 15,000 - 20,000 = 115,000
      const sheet1 = report.merchants.find((m) => m.merchantId === 'mch-1');
      expect(sheet1).toBeDefined();
      expect(sheet1?.grossGmvToman).toBe(150000);
      expect(sheet1?.commissionCutToman).toBe(15000);
      expect(sheet1?.refundsDeductedToman).toBe(20000);
      expect(sheet1?.netPayableToman).toBe(115000);

      // Merchant 2:
      // GMV = 200,000
      // Commission (15%) = 30,000
      // Refunds = 0
      // Net Payable = 200,000 - 30,000 = 170,000
      const sheet2 = report.merchants.find((m) => m.merchantId === 'mch-2');
      expect(sheet2).toBeDefined();
      expect(sheet2?.grossGmvToman).toBe(200000);
      expect(sheet2?.commissionCutToman).toBe(30000);
      expect(sheet2?.refundsDeductedToman).toBe(0);
      expect(sheet2?.netPayableToman).toBe(170000);

      // Overall totals:
      // Total GMV = 350,000
      // Total Commission = 45,000
      // Total Refunds = 20,000
      // Total Net Payable = 285,000
      expect(report.totalGmvToman).toBe(350000);
      expect(report.totalPlatformCommissionToman).toBe(45000);
      expect(report.totalRefundsToman).toBe(20000);
      expect(report.totalNetPayableToman).toBe(285000);
    });

    it('protects against negative net payable if refunds exceed merchant revenue', async () => {
      const mockMerchantExcessRefunds = [
        {
          id: 'mch-loss',
          businessNameFa: 'فروشگاه ضررده',
          commissionPercent: 10,
          orders: [
            {
              totalAmountToman: 50000,
              refunds: [{ amountToman: 60000 }],
            },
          ],
        },
      ];

      vi.spyOn(prisma.merchant, 'findMany').mockResolvedValue(mockMerchantExcessRefunds as any);

      const report = await adminService.getSettlementReport();
      const sheet = report.merchants[0];

      // Net payable should never be negative
      expect(sheet.netPayableToman).toBe(0);
    });
  });

  // =========================================================================
  // 6. Category Management (CP-08.4)
  // =========================================================================
  describe('6. Category Management', () => {
    it('creates category and logs audit action', async () => {
      vi.spyOn(prisma.category, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.category, 'create').mockResolvedValue({
        id: 'cat-new-1',
        slug: 'fresh-fruits',
        nameFa: 'میوه و تره‌بار تازه',
        iconUrl: '/icons/fruits.svg',
        parentId: null,
      } as any);

      const category = await adminService.createCategory('admin-user-1', {
        slug: 'fresh-fruits',
        nameFa: 'میوه و تره‌بار تازه',
        iconUrl: '/icons/fruits.svg',
      });

      expect(category.id).toBe('cat-new-1');
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_CREATE_CATEGORY',
          entityType: 'CATEGORY',
          entityId: 'cat-new-1',
          actorRole: Role.ADMIN,
        })
      );
    });

    it('rejects category creation with duplicate slug', async () => {
      vi.spyOn(prisma.category, 'findUnique').mockResolvedValue({
        id: 'cat-existing',
        slug: 'bakery',
      } as any);

      await expect(
        adminService.createCategory('admin-user-1', {
          slug: 'bakery',
          nameFa: 'نان تازه',
        })
      ).rejects.toThrow('دسته‌بندی با این شناسه انگلیسی قبلاً ثبت شده است');
    });
  });

  // =========================================================================
  // 7. System Settings & Configuration (CP-08.7)
  // =========================================================================
  describe('7. System Settings & Configuration', () => {
    it('updates maintenance mode and logs admin audit', async () => {
      const updated = await adminService.updateSystemSettings('admin-user-1', {
        maintenanceMode: true,
        announcementBannerFa: 'سامانه موقتاً برای ارتقاء پایگاه داده متوقف است.',
        activeSmsProvider: 'FARAZSMS',
      });

      expect(updated.maintenanceMode).toBe(true);
      expect(updated.announcementBannerFa).toBe('سامانه موقتاً برای ارتقاء پایگاه داده متوقف است.');
      expect(updated.activeSmsProvider).toBe('FARAZSMS');

      const current = adminService.getSystemSettings();
      expect(current.maintenanceMode).toBe(true);
      expect(current.activeSmsProvider).toBe('FARAZSMS');

      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_UPDATE_SYSTEM_SETTINGS',
          entityType: 'SYSTEM',
          entityId: 'SYSTEM_SETTINGS',
          actorRole: Role.ADMIN,
        })
      );

      // Clean up / restore defaults
      await adminService.updateSystemSettings('admin-user-1', {
        maintenanceMode: false,
        activeSmsProvider: 'MOCK',
      });
    });
  });
});
