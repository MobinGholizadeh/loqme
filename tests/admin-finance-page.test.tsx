// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Finance from '@/app/(admin)/admin/finance/page';
const merchant = (businessNameFa = 'فروشگاه') => ({ merchantId: 'merchant', businessNameFa, commissionPercent: 0, grossGmvToman: 100, commissionCutToman: 0, refundsDeductedToman: 0, netPayableToman: 100, shabaNumber: null, ordersCount: 1 });
const report = (merchants: unknown[] = []) => ({ merchants, totalGmvToman: 100, totalPlatformCommissionToman: 0, totalRefundsToman: 0, totalNetPayableToman: 100 });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('Admin settlement display and export', () => {
  it('disables export before data is available and for an empty report', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: report() }) });
    render(<Finance />); expect((screen.getByRole('button', { name: /CSV/ }) as HTMLButtonElement).disabled).toBe(true);
    await screen.findByText('تراکنشی برای تسویه موجود نیست'); expect((screen.getByRole('button', { name: /CSV/ }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('exports complete escaped text including hash, quotes, newlines and formulas', async () => {
    const name = '=SUM(1,2) # "فروشگاه"\nدوم';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: report([merchant(name)]) }) });
    let href = '', download = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { href = this.href; download = this.download; });
    render(<Finance />); await screen.findByText('ثبت نشده');
    fireEvent.click(screen.getByRole('button', { name: /CSV/ }));
    expect(href).not.toContain('#');
    const csv = decodeURIComponent(href.slice(href.indexOf(',') + 1));
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('merchant,"\'=SUM(1,2) # ""فروشگاه""\nدوم",0,100,0,0,100,,1');
    expect(download).toMatch(/^loqme-settlement-batch-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(document.querySelector('a[download]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'محاسبه مجدد' })); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
  it.each(['http', 'business', 'network'])('shows %s failure without a misleading settlement report', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline'));
    else fetchMock.mockResolvedValue({ ok: failure !== 'http', json: async () => ({ success: failure !== 'business', message: 'failed' }) });
    render(<Finance />); await screen.findByText('دریافت اطلاعات انجام نشد'); expect(screen.queryByRole('table')).toBeNull();
  });
});
