import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApplication } from '@/domain/business/application.service';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    merchantApplication: {
      findUnique: vi.fn(),
    },
    merchant: {
      findFirst: vi.fn(),
    },
  },
}));

describe('getApplication for existing / approved merchants', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns approved merchant details even when MerchantApplication table has no row for this merchant', async () => {
    const userId = 'user-merchant-1';
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      isActive: true,
      role: 'MERCHANT_OWNER',
      fullName: 'علی همت‌نیا',
    } as any);

    // No application in MerchantApplication table
    vi.mocked(prisma.merchantApplication.findUnique).mockResolvedValue(null);

    // Merchant exists in Merchant table and is APPROVED
    vi.mocked(prisma.merchant.findFirst).mockResolvedValue({
      id: 'merchant-123',
      ownerUserId: userId,
      businessNameFa: 'نقل و حلوای سنتی هما ارومیه',
      businessType: 'CONFECTIONERY',
      verificationStatus: 'APPROVED',
      licenseNumber: '12345',
      mapirPlaceId: 'place-1',
      createdAt: new Date('2026-09-01T10:00:00Z'),
      updatedAt: new Date('2026-09-02T10:00:00Z'),
      locations: [
        {
          cityId: 'city-urmia',
          addressFa: 'ارومیه، خیابان امام',
          latitude: 37.55,
          longitude: 45.07,
          phone: '04433333333',
          city: { nameFa: 'ارومیه' },
          hours: [
            {
              dayOfWeek: 0,
              isOpen: true,
              storeOpenTime: '08:00',
              storeCloseTime: '22:00',
            },
          ],
        },
      ],
    } as any);

    const result = await getApplication(userId);

    expect(result).not.toBeNull();
    expect(result?.status).toBe('APPROVED');
    expect(result?.businessNameFa).toBe('نقل و حلوای سنتی هما ارومیه');
    expect(result?.merchantId).toBe('merchant-123');
    expect(result?.cityNameFa).toBe('ارومیه');
    expect(result?.addressFa).toBe('ارومیه، خیابان امام');
  });

  it('returns null if user has no application and no approved merchant', async () => {
    const userId = 'user-customer-1';
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      isActive: true,
      role: 'CUSTOMER',
      fullName: 'مشتری آزمایشی',
    } as any);

    vi.mocked(prisma.merchantApplication.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.merchant.findFirst).mockResolvedValue(null);

    const result = await getApplication(userId);
    expect(result).toBeNull();
  });
});
