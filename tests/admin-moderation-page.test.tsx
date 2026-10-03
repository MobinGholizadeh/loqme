// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Moderation from '@/app/(admin)/admin/moderation/page';
const item = (extra = {}) => ({ id: 'complaint', category: 'EXPIRED_FOOD', status: 'PENDING', descriptionFa: 'گزارش آزمایش', evidencePhotos: ['/evidence.png'], customer: { fullName: 'مشتری', user: { mobile: '09121111111' } }, merchant: { businessNameFa: 'فروشگاه' }, order: { orderNumber: 'LQ-123', totalAmountToman: 100 }, ...extra });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => options?.method ? { success: true } : { success: true, items: [item()] } })); vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('Admin complaint decisions and safety operations', () => {
  it.each([['استرداد وجه (', 'REFUND'], ['ثبت اخطار', 'WARNING'], ['رد شکایت', 'REJECT']])('confirms %s before sending the correct resolution contract', async (label, action) => {
    render(<Moderation />); await screen.findByText('گزارش آزمایش'); expect(screen.getByText(/هشدار سلامت غذا/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: name => name.startsWith(label) }));
    expect(fetchMock.mock.calls.filter(c => c[1]?.method)).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('توضیحات و یادداشت بازرسی مدیر:'), { target: { value: '  بررسی شد  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'تایید نهایی اقدام' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const write = fetchMock.mock.calls.find(c => c[1]?.method)!;
    expect(write[0]).toBe('/api/admin/complaints/complaint/resolve');
    expect(JSON.parse(write[1].body)).toEqual({ action, notesFa: 'بررسی شد', ...(action === 'REFUND' ? { refundAmountToman: 100 } : {}) });
  });
  it('does not submit cancelled decisions and can inspect evidence', async () => {
    render(<Moderation />); await screen.findByText('گزارش آزمایش');
    fireEvent.click(screen.getByRole('button', { name: 'ثبت اخطار' })); fireEvent.click(screen.getByRole('button', { name: 'انصراف' }));
    expect(fetchMock.mock.calls.filter(c => c[1]?.method)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'مدرک 1' })); expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it.each([['در انتظار بررسی', 'PENDING'], ['استرداد وجه شده', 'RESOLVED_REFUNDED'], ['رد شده', 'RESOLVED_REJECTED']])('filters complaints by %s and restores the full list', async (name, status) => {
    render(<Moderation />); await screen.findByText('گزارش آزمایش');
    fireEvent.click(screen.getByRole('button', { name })); await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(`/api/admin/complaints?status=${status}`));
    fireEvent.click(screen.getByRole('button', { name: /همه گزارش‌ها/ })); await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/complaints'));
  });
  it.each(['RESOLVED_REFUNDED', 'RESOLVED_REJECTED', 'RESOLVED_WARNING'])('displays resolved %s without further action buttons', async status => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, items: [item({ status, category: 'UNKNOWN', customer: { user: { mobile: '09121111111' } }, adminNotesFa: 'بسته شد', resolvedByUser: { mobile: 'admin-phone' } })] }) });
    render(<Moderation />); await screen.findByText('بسته شد'); expect(screen.getByText('UNKNOWN')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'ثبت اخطار' })).toBeNull();
  });
  it.each(['http', 'business', 'network'])('keeps the resolution open after %s failure', async failure => {
    const read = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) => {
      if (!options?.method) return read(url, options);
      if (failure === 'network') throw new Error('offline');
      return { ok: failure !== 'http', json: async () => ({ success: failure !== 'business', message: 'resolution failed' }) };
    });
    render(<Moderation />); await screen.findByText('گزارش آزمایش'); fireEvent.click(screen.getByRole('button', { name: 'ثبت اخطار' })); fireEvent.click(screen.getByRole('button', { name: 'تایید نهایی اقدام' }));
    await screen.findByText(failure === 'network' ? 'offline' : 'resolution failed'); expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it.each(['success', 'http', 'business', 'network'])('submits a safety override and reports %s accurately', async outcome => {
    const read = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) => {
      if (!options?.method) return read(url, options);
      if (outcome === 'network') throw new Error('offline');
      return { ok: outcome !== 'http', json: async () => ({ success: outcome !== 'business', message: 'safety failed' }) };
    });
    render(<Moderation />); await screen.findByText('گزارش آزمایش'); fireEvent.click(screen.getByRole('button', { name: /تغییر وضعیت سلامت بسته/ }));
    fireEvent.change(screen.getByLabelText('شناسه بسته (Listing ID):'), { target: { value: 'listing' } });
    fireEvent.change(screen.getByLabelText('وضعیت سلامت جدید:'), { target: { value: 'UNSAFE' } });
    fireEvent.change(screen.getByLabelText('دلیل بازرسی / مستندات:'), { target: { value: '  فساد  ' } });
    fireEvent.submit(screen.getByLabelText('شناسه بسته (Listing ID):').closest('form')!);
    await screen.findByText(outcome === 'success' ? 'وضعیت سلامت بسته با موفقیت تغییر کرد و در لاگ امنیتی ثبت شد.' : outcome === 'network' ? 'offline' : 'safety failed');
    const write = fetchMock.mock.calls.find(c => c[1]?.method)!; expect(write[0]).toBe('/api/admin/listings/listing/safety'); expect(JSON.parse(write[1].body)).toEqual({ safetyStatus: 'UNSAFE', reasonFa: 'فساد' });
    expect(Boolean(screen.queryByLabelText('شناسه بسته (Listing ID):'))).toBe(outcome !== 'success');
  });
  it.each(['empty', 'http', 'business', 'network'])('handles %s listing responses', async outcome => {
    if (outcome === 'network') fetchMock.mockRejectedValue(new Error('offline'));
    else fetchMock.mockResolvedValue({ ok: outcome !== 'http', json: async () => ({ success: outcome !== 'business' }) });
    render(<Moderation />); await screen.findByText(outcome === 'empty' ? 'شکایتی با این فیلتر یافت نشد' : 'دریافت اطلاعات انجام نشد');
  });
});
