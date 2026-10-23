// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ApplicationStatus } from '@/components/business/ApplicationStatus';

const mockUseSession = vi.fn();
vi.mock('@/components/auth/SessionProvider', () => ({
  useSession: () => mockUseSession(),
}));

const mockApplication = vi.fn();
vi.mock('@loqme/api', () => ({
  apiClient: {
    business: {
      application: () => mockApplication(),
    },
  },
}));

describe('ApplicationStatus component for approved merchants and customers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders direct link to /merchant when store is approved and user has merchant role', async () => {
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'merchant-user-id',
        role: 'MERCHANT_OWNER',
        mobile: '09122222222',
      },
    });

    mockApplication.mockResolvedValue({
      data: {
        id: 'app-1',
        ownerName: 'مدیر هما',
        businessNameFa: 'نقل و حلوای سنتی هما ارومیه',
        businessType: 'CONFECTIONERY',
        cityId: 'urmia',
        cityNameFa: 'ارومیه',
        addressFa: 'ارومیه، خیابان امام',
        latitude: 37.55,
        longitude: 45.07,
        hours: [],
        status: 'APPROVED',
        revision: 1,
        reviewReason: null,
        merchantId: 'store-1',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    });

    render(<ApplicationStatus />);

    await screen.findByText('نقل و حلوای سنتی هما ارومیه');

    expect(screen.getByText(/فروشگاه شما در لقمه تأیید شده است/)).toBeTruthy();

    const link = screen.getByRole('link', { name: 'ورود به پنل فروشگاه' });
    expect(link.getAttribute('href')).toBe('/merchant');
    expect(link.getAttribute('href')).not.toBe('/business/login');
  });

  it('renders direct link to /merchant when user is MERCHANT_OWNER even if application is null', async () => {
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'merchant-user-id',
        role: 'MERCHANT_OWNER',
        mobile: '09122222222',
      },
    });

    mockApplication.mockResolvedValue({ data: null });

    render(<ApplicationStatus />);

    await screen.findByText('فروشگاه شما فعال و تأیید شده است');

    const link = screen.getByRole('link', { name: 'ورود به پنل فروشگاه' });
    expect(link.getAttribute('href')).toBe('/merchant');
    expect(link.getAttribute('href')).not.toBe('/business/login');
    expect(screen.queryByText(/هنوز درخواستی ثبت نشده است/)).toBeNull();
  });

  it('renders link to /business/login when customer application was approved and user role is still CUSTOMER', async () => {
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 'customer-user-id',
        role: 'CUSTOMER',
        mobile: '09121111111',
      },
    });

    mockApplication.mockResolvedValue({
      data: {
        id: 'app-2',
        ownerName: 'مشتری سابق',
        businessNameFa: 'کافه دانشکده',
        businessType: 'CAFE',
        cityId: 'urmia',
        cityNameFa: 'ارومیه',
        addressFa: 'ارومیه، خیابان دانشکده',
        latitude: 37.55,
        longitude: 45.07,
        hours: [],
        status: 'APPROVED',
        revision: 1,
        reviewReason: null,
        merchantId: 'store-2',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    });

    render(<ApplicationStatus />);

    await screen.findByText('کافه دانشکده');

    expect(screen.getByText(/دوباره با کد پیامکی وارد شوید/)).toBeTruthy();

    const link = screen.getByRole('link', { name: 'ورود به پنل کسب‌وکار' });
    expect(link.getAttribute('href')).toBe('/business/login');
  });
});
