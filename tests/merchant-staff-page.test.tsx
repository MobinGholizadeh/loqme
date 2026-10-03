// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Staff from '@/app/(merchant)/merchant/staff/page';
let fetchMock: ReturnType<typeof vi.fn>;
const member = (role = 'CASHIER', extra = {}) => ({ id: 'staff', userId: 'user', mobile: '09121111111', fullName: 'همکار آزمایش', role, canScanPickup: true, createdAt: '2026-10-01T00:00:00Z', ...extra });
beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => ({ success: true, data: options?.method ? {} : [member()] }) })); vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('Merchant staff management interactions', () => {
  it.each(['CASHIER', 'MANAGER'])('invites a %s with normalized digits and trimmed name', async role => {
    render(<Staff />); await screen.findByText('همکار آزمایش'); fireEvent.click(screen.getByRole('button', { name: /افزودن همکار جدید/ }));
    fireEvent.change(screen.getByLabelText('شماره موبایل همکار (فرمت استاندارد ایران)'), { target: { value: ' ۰۹۱۲۱۱۱۱۱۱۱ ' } });
    fireEvent.change(screen.getByLabelText('نام و نام خانوادگی همکار'), { target: { value: '  نام جدید  ' } });
    fireEvent.click(screen.getByRole('button', { name: role === 'MANAGER' ? /^مدیر فروشگاه/ : /^صندوق‌دار/ }));
    fireEvent.click(screen.getByRole('button', { name: 'افزودن و فعال‌سازی' })); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const write = fetchMock.mock.calls.find(c => c[1]?.method)!; expect(write[0]).toBe('/api/merchant/staff'); expect(JSON.parse(write[1].body)).toEqual({ mobile: '09121111111', fullName: 'نام جدید', role, canScanPickup: true });
    expect(screen.getByText(/همکار جدید با موفقیت اضافه شد/)).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'بستن' })); expect(screen.queryByText(/همکار جدید با موفقیت اضافه شد/)).toBeNull();
  });
  it('requires confirmation for revocation and cancels without a write', async () => {
    render(<Staff />); await screen.findByText('همکار آزمایش'); fireEvent.click(screen.getByRole('button', { name: 'لغو دسترسی' }));
    fireEvent.click(screen.getByRole('button', { name: 'انصراف' })); expect(fetchMock.mock.calls.filter(c => c[1]?.method)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'لغو دسترسی' })); fireEvent.click(screen.getByRole('button', { name: 'تایید و لغو دسترسی' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(fetchMock).toHaveBeenCalledWith('/api/merchant/staff/staff', { method: 'DELETE' }); expect(screen.getByText(/دسترسی همکار با موفقیت لغو شد/)).toBeTruthy();
  });
  it('protects the owner and accurately displays staff without names or scanning permission', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [member('OWNER'), member('MANAGER', { id: 'manager', fullName: null, canScanPickup: false })] }) });
    render(<Staff />); await screen.findByText('مالک اصلی'); expect(screen.getByText('همکار گرامی')).toBeTruthy(); expect(screen.getByText('فاقد مجوز اسکن')).toBeTruthy(); expect(screen.getAllByRole('button', { name: 'لغو دسترسی' })).toHaveLength(1);
  });
  it.each(['http', 'business', 'network'])('retains invitation input after %s failure', async kind => {
    const read = fetchMock.getMockImplementation()!; fetchMock.mockImplementation(async (url, options) => {
      if (!options?.method) return read(url, options); if (kind === 'network') throw new Error('offline');
      return { ok: kind !== 'http', json: async () => ({ success: kind !== 'business' }) };
    });
    render(<Staff />); await screen.findByText('همکار آزمایش'); fireEvent.click(screen.getByRole('button', { name: /افزودن همکار جدید/ }));
    fireEvent.change(screen.getByLabelText('شماره موبایل همکار (فرمت استاندارد ایران)'), { target: { value: '09121111111' } }); fireEvent.click(screen.getByRole('button', { name: 'افزودن و فعال‌سازی' }));
    await screen.findByText(kind === 'network' ? 'ارتباط با سرور برقرار نشد' : 'خطا در افزودن همکار'); expect(screen.getByRole('dialog')).toBeTruthy();
    expect((screen.getByLabelText('شماره موبایل همکار (فرمت استاندارد ایران)') as HTMLInputElement).value).toBe('09121111111');
  });
  it.each(['http', 'business', 'network'])('does not claim revocation succeeded after %s failure', async kind => {
    const read = fetchMock.getMockImplementation()!; fetchMock.mockImplementation(async (url, options) => {
      if (!options?.method) return read(url, options); if (kind === 'network') throw new Error('offline');
      return { ok: kind !== 'http', json: async () => ({ success: kind !== 'business' }) };
    });
    render(<Staff />); await screen.findByText('همکار آزمایش'); fireEvent.click(screen.getByRole('button', { name: 'لغو دسترسی' })); fireEvent.click(screen.getByRole('button', { name: 'تایید و لغو دسترسی' }));
    await screen.findByText(kind === 'network' ? 'ارتباط با سرور برقرار نشد' : 'خطا در لغو دسترسی همکار'); expect(screen.getByRole('dialog')).toBeTruthy(); expect(screen.queryByText(/با موفقیت لغو شد/)).toBeNull();
  });
  it.each(['empty', 'http', 'business', 'network'])('handles %s staff loading', async kind => {
    if (kind === 'network') fetchMock.mockRejectedValue(new Error('offline'));
    else fetchMock.mockResolvedValue({ ok: kind !== 'http', json: async () => ({ success: kind !== 'business', data: [] }) });
    render(<Staff />); await screen.findByText(kind === 'empty' ? 'همکاری در این فروشگاه ثبت نشده است' : 'دریافت اطلاعات انجام نشد');
  });
});
