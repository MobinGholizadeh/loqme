// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import MerchantDashboardPage from '@/app/(merchant)/merchant/page';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mockDashboardStats = {
  merchantId: 'merchant-123',
  businessNameFa: 'قنادی آذربایجان',
  verificationStatus: 'APPROVED',
  activeListingsCount: 5,
  reservedBagsCount: 2,
  soldTodayCount: 8,
  pendingPickupsCount: 1,
  grossRevenueTodayToman: 450000,
  netPayoutTodayToman: 382500,
  ratingAverage: 4.8,
  ratingCount: 24,
  nextPickupWindow: null,
};

describe('Merchant dashboard bank card preview truth and approval states', () => {
  it('renders clean placeholder state without fabricating fake card numbers or names when no bank account is registered', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/merchant/dashboard')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: mockDashboardStats }),
          });
        }
        if (url.includes('/api/merchant/bank-accounts')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    render(<MerchantDashboardPage />);

    // Must show the empty placeholder and not the hardcoded fake card
    await waitFor(() => {
      expect(screen.getByText('حساب یا کارت تسویه ثبت نشده است')).toBeTruthy();
    });

    expect(screen.getByText('+ اتصال شماره شبا')).toBeTruthy();
    // Must NOT contain the old hardcoded fake card numbers
    expect(screen.queryByText(/۷۸۹۰/)).toBeNull();
  });

  it('renders blurred pending preview with warning badge when only an unapproved pending card exists', async () => {
    const pendingAccount = {
      id: 'acc-pending',
      merchantId: 'merchant-123',
      shabaNumber: 'IR120170000000123456789012',
      bankName: 'بانک ملی ایران',
      bankCode: '017',
      accountHolder: 'محمد امینی',
      isDefault: false,
      status: 'PENDING',
      rejectionReason: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/merchant/dashboard')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: mockDashboardStats }),
          });
        }
        if (url.includes('/api/merchant/bank-accounts')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [pendingAccount] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    render(<MerchantDashboardPage />);

    // Must show pending alert and submitted details
    await waitFor(() => {
      expect(screen.getByText('در انتظار بررسی و تایید مدیریت')).toBeTruthy();
    });

    expect(screen.getByText('محمد امینی')).toBeTruthy();
    expect(screen.getByText('بانک ملی ایران')).toBeTruthy();
    expect(screen.getByText('پیگیری وضعیت حساب')).toBeTruthy();
    // Must not show "تایید شده"
    expect(screen.queryByText('تایید شده')).toBeNull();
  });

  it('renders approved card with real cardholder name and verified badge after admin approval', async () => {
    const approvedAccount = {
      id: 'acc-approved',
      merchantId: 'merchant-123',
      shabaNumber: 'IR550120000000987654321098',
      bankName: 'بانک ملت',
      bankCode: '012',
      accountHolder: 'سارا سعیدی',
      isDefault: true,
      status: 'APPROVED',
      rejectionReason: null,
      reviewedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/merchant/dashboard')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: mockDashboardStats }),
          });
        }
        if (url.includes('/api/merchant/bank-accounts')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [approvedAccount] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    render(<MerchantDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('تایید شده')).toBeTruthy();
    });

    expect(screen.getByText('سارا سعیدی')).toBeTruthy();
    expect(screen.getByText('بانک ملت')).toBeTruthy();
    expect(screen.getByText('حساب پیش‌فرض تسویه')).toBeTruthy();
    expect(screen.getByText('مدیریت حساب‌ها')).toBeTruthy();
  });
});
