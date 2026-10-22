// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Dashboard from '@/app/(admin)/admin/page';
import Customers from '@/app/(admin)/admin/customers/page';
import Settings from '@/app/(admin)/admin/settings/page';
let fetchMock: ReturnType<typeof vi.fn>;
const response = (data: unknown, success = true, ok = true) => ({ ok, json: async () => ({ success, data }) });
beforeEach(() => {
  fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('Admin dashboard loading and refresh', () => {
  it.each([{}, { activeMerchantsCount: 12, pendingMerchantsCount: 3, gmv24hToman: 1234000, commission24hToman: 123400, activeListingsCount: 24, openComplaintsCount: 1 }])('renders only API metrics and refreshes them (%o)', async data => {
    fetchMock.mockResolvedValue(response(data)); render(<Dashboard />); expect(screen.getByText('در حال دریافت آمار کلان بازار…')).toBeTruthy();
    await screen.findByRole('link', { name: /صورت‌حساب و تسویه/ }); expect(fetchMock).toHaveBeenCalledWith('/api/admin/dashboard');
    expect(screen.getAllByText(data.activeMerchantsCount ? '۱۲' : '۰')[0]).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /بروزرسانی/ })); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
  it.each(['http', 'business', 'missing', 'exception', 'unknown'])('displays a dashboard %s failure without inventing KPI values', async failure => {
    if (failure === 'exception') fetchMock.mockRejectedValue(new Error('offline'));
    else if (failure === 'unknown') fetchMock.mockRejectedValue(null);
    else fetchMock.mockResolvedValue(response(failure === 'missing' ? null : {}, failure !== 'business', failure !== 'http'));
    render(<Dashboard />); expect((await screen.findByRole('alert')).textContent).toBeTruthy(); expect(screen.queryByRole('link', { name: /صورت‌حساب و تسویه/ })).toBeNull();
  });
  it('polls metrics and removes the interval on unmount', async () => {
    vi.useFakeTimers(); fetchMock.mockResolvedValue(response({})); const view = render(<Dashboard />);
    await act(async () => {}); await act(() => vi.advanceTimersByTime(30000)); expect(fetchMock).toHaveBeenCalledTimes(2);
    view.unmount(); await act(() => vi.advanceTimersByTime(30000)); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
describe('Admin customer actions', () => {
  const customer = (isActive = true) => ({ userId: 'customer-user', fullName: 'خریدار آزمایش', mobile: '09121111111', totalOrdersCount: 2, cumulativeSavingsToman: 10000, complaintsCount: 1, isActive });
  it('shows an empty result and sends trimmed search queries on input', async () => {
    fetchMock.mockResolvedValue(response([])); render(<Customers />); await screen.findByText('کاربری با این مشخصات یافت نشد');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  خریدار  ' } });
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(`/api/admin/customers?search=${encodeURIComponent('خریدار')}`));
    fireEvent.click(screen.getByRole('button', { name: 'بروزرسانی لیست' })); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
  it.each([true, false])('requires confirmation before changing account activity from %s', async isActive => {
    fetchMock.mockImplementation(async (_url, options) => options?.method ? response({}) : response([customer(isActive)])); render(<Customers />);
    await screen.findByText('خریدار آزمایش'); fireEvent.click(screen.getByRole('button', { name: isActive ? 'مسدودسازی' : 'فعال‌سازی' }));
    expect(fetchMock.mock.calls.filter(c => c[1]?.method)).toHaveLength(0); fireEvent.click(screen.getByRole('button', { name: 'انصراف' })); expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: isActive ? 'مسدودسازی' : 'فعال‌سازی' })); fireEvent.click(screen.getByRole('button', { name: 'تایید عملیات' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const write = fetchMock.mock.calls.find(c => c[1]?.method)!; expect(write[0]).toBe('/api/admin/customers/customer-user'); expect(JSON.parse(write[1].body)).toMatchObject({ isActive: !isActive });
    expect(screen.getByText(/وضعیت حساب کاربر به/)).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'بستن' })); expect(screen.queryByText(/وضعیت حساب کاربر به/)).toBeNull();
  });
  it.each(['http', 'business', 'network'])('does not claim an account update succeeded on %s failure', async failure => {
    fetchMock.mockImplementation(async (_url, options) => {
      if (!options?.method) return response([{ ...customer(), fullName: '', complaintsCount: 0 }]);
      if (failure === 'network') throw new Error('offline'); return response({}, failure !== 'business', failure !== 'http');
    });
    render(<Customers />); await screen.findByText('مشتری لقمه'); fireEvent.click(screen.getByRole('button', { name: 'مسدودسازی' })); fireEvent.click(screen.getByRole('button', { name: 'تایید عملیات' }));
    await screen.findByText(failure === 'network' ? 'ارتباط با سرور برقرار نشد' : 'خطا در تغییر وضعیت حساب کاربر'); expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it.each(['http', 'business', 'network'])('shows customer load %s errors', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline')); else fetchMock.mockResolvedValue(response([], failure !== 'business', failure !== 'http'));
    render(<Customers />); await screen.findByText('دریافت اطلاعات انجام نشد'); expect(screen.queryByRole('table')).toBeNull();
  });
});
describe('Admin settings editing', () => {
  it('loads saved settings and sends edited maintenance, announcement and provider values', async () => {
    fetchMock.mockResolvedValue(response({ maintenanceMode: false, announcementBannerFa: null, activeSmsProvider: null })); const view = render(<Settings />);
    await screen.findByRole('button', { name: 'ذخیره تنظیمات سیستم' }); fireEvent.click(screen.getByRole('checkbox')); expect(screen.getByText(/هشدار: حالت تعمیر/)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  اطلاعیه آزمایش  ' } }); fireEvent.click(screen.getByRole('button', { name: /سامانه پیامک SMS.ir/ })); fireEvent.submit(view.container.querySelector('form')!);
    await screen.findByText('تنظیمات سراسری سامانه با موفقیت ذخیره گردید');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ maintenanceMode: true, announcementBannerFa: 'اطلاعیه آزمایش', activeSmsProvider: 'SMS_IR' });
    fireEvent.click(screen.getByRole('button', { name: 'بستن' })); expect(screen.queryByText('تنظیمات سراسری سامانه با موفقیت ذخیره گردید')).toBeNull();
  });
  it.each(['http', 'business', 'network'])('preserves editable settings after save %s failure', async failure => {
    fetchMock.mockResolvedValueOnce(response({ maintenanceMode: true, announcementBannerFa: 'saved', activeSmsProvider: 'SMS_IR' }));
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline')); else fetchMock.mockResolvedValue(response({}, failure !== 'business', failure !== 'http'));
    const view = render(<Settings />); await screen.findByRole('button', { name: 'ذخیره تنظیمات سیستم' }); fireEvent.click(screen.getByRole('button', { name: /کنسول شبیه‌ساز/ })); fireEvent.submit(view.container.querySelector('form')!);
    await screen.findByText(failure === 'network' ? 'ارتباط با سرور برقرار نشد' : 'خطا در ذخیره تنظیمات'); expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('saved');
  });
  it.each(['http', 'business', 'network'])('shows a settings load %s error', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline')); else fetchMock.mockResolvedValue(response({}, failure !== 'business', failure !== 'http'));
    render(<Settings />); await screen.findByText('دریافت اطلاعات انجام نشد'); expect(screen.queryByRole('button', { name: 'ذخیره تنظیمات سیستم' })).toBeNull();
  });
});

