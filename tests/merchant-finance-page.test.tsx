// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Finance from '@/app/(merchant)/merchant/finance/page';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const summary = { merchantId: 'merchant', businessNameFa: 'فروشگاه', commissionPercent: 10, grossSalesToman: 1000, platformCommissionToman: 100, netPayableBalanceToman: 900, totalOrdersCount: 1, completedOrdersCount: 1, shabaNumber: null, isBankVerified: false, transactions: [] };
describe('Merchant finance bank truth and report states', () => {
  it('does not fabricate an account or a verification badge when no bank is registered', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: summary }) }); vi.stubGlobal('fetch', fetchMock);
    render(<Finance />); await screen.findByText('حساب بانکی ثبت نشده است'); expect(screen.getByText('حساب بانکی تایید نشده است')).toBeTruthy(); expect(screen.queryByText(/شبا تایید شده در سامانه/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /بروزرسانی حساب/ })); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
  it.each([true, false])('shows only supplied bank identity and respects verification %s', async isBankVerified => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { ...summary, shabaNumber: 'IR-TEST-ACCOUNT', isBankVerified,
      transactions: [{ id: 'tx', descriptionFa: 'تراکنش آزمایش', grossAmountToman: 1000, commissionAmountToman: 100, netAmountToman: 900, createdAt: new Date().toISOString() }] } }) }));
    render(<Finance />); await screen.findByText('IR-TEST-ACCOUNT'); expect(screen.getByText('تراکنش آزمایش')).toBeTruthy(); expect(Boolean(screen.queryByText(/شبا تایید شده در سامانه/))).toBe(isBankVerified);
  });
  it.each(['http', 'business', 'network'])('shows load failure without claiming financial results (%s)', async failure => {
    const fetchMock = vi.fn(); if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline')); else fetchMock.mockResolvedValue({ ok: failure !== 'http', json: async () => ({ success: failure !== 'business' }) });
    vi.stubGlobal('fetch', fetchMock); render(<Finance />); await screen.findByText('دریافت اطلاعات انجام نشد'); expect(screen.queryByRole('table')).toBeNull();
  });
});
