// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
const state = vi.hoisted(() => ({ setUser: vi.fn(), query: '' }));
vi.mock('@/components/auth/SessionProvider', () => ({ useSession: () => ({ setUser: state.setUser }) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
import { OtpLoginForm } from '@/components/auth/OtpLoginForm';
let fetchMock: ReturnType<typeof vi.fn>;
const ok = (data: unknown) => ({ ok: true, json: async () => data });
beforeEach(() => {
  state.setUser.mockReset(); state.query = ''; vi.useFakeTimers();
  fetchMock = vi.fn().mockImplementation(async url => url.endsWith('request-otp') ? ok({ success: true, mobile: '09121111111', expiresInSeconds: 2 }) : url.endsWith('verify-otp') ? ok({ success: true }) : ok({ authenticated: true, user: { id: 'user', role: 'CUSTOMER' } }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function phone() {
  fireEvent.change(screen.getByLabelText('شماره موبایل'), { target: { value: '۰۹۱۲۱۱۱۱۱۱۱' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'دریافت کد تایید' })));
}
async function verify() {
  fireEvent.change(screen.getByLabelText('کد تایید ۵ رقمی'), { target: { value: '١٢٣۴۵' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'تایید و ورود' })));
}
describe('OTP form authentication flow', () => {
  it.each(['login', 'register'] as const)('offers guest browsing in %s on both steps without creating a session', async initialMode => {
    render(<OtpLoginForm initialMode={initialMode} />);
    expect(screen.getByRole('link', { name: 'ادامه بدون حساب کاربری' }).getAttribute('href')).toBe('/discover');
    expect(fetchMock).not.toHaveBeenCalled();
    await phone();
    expect(screen.getByRole('link', { name: 'ادامه بدون حساب کاربری' }).getAttribute('href')).toBe('/discover');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.setUser).not.toHaveBeenCalled();
  });
  it.each([{ audience: 'business' as const }, { embedded: true }])('does not offer guest entry in restricted forms %j', async props => {
    render(<OtpLoginForm {...props} />);
    expect(screen.queryByRole('link', { name: 'ادامه بدون حساب کاربری' })).toBeNull();
    await phone();
    expect(screen.queryByRole('link', { name: 'ادامه بدون حساب کاربری' })).toBeNull();
  });
  it('normalizes Persian/Arabic digits and waits for cookie-backed session before success', async () => {
    const success = vi.fn(); render(<OtpLoginForm preventRedirect onSuccess={success} embedded />); await phone(); await verify();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ mobile: '09121111111', mode: 'login', audience: 'customer' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ mobile: '09121111111', code: '12345' });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' });
    expect(state.setUser).toHaveBeenCalledWith({ id: 'user', role: 'CUSTOMER' }); expect(success).toHaveBeenCalledOnce();
  });
  it('rejects invalid phone numbers before making a request', async () => {
    render(<OtpLoginForm preventRedirect />); fireEvent.change(screen.getByLabelText('شماره موبایل'), { target: { value: '123' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'دریافت کد تایید' })));
    expect(screen.getByText(/شماره موبایل معتبر ایران/)).toBeTruthy(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('validates OTP length and strips non-digits', async () => {
    render(<OtpLoginForm preventRedirect />); await phone(); const input = screen.getByLabelText('کد تایید ۵ رقمی');
    fireEvent.change(input, { target: { value: '۱۲ab۳' } }); expect((input as HTMLInputElement).value).toBe('123');
    await act(async () => fireEvent.submit(input.closest('form')!)); expect(screen.getByText('کد تایید باید ۵ رقم باشد')).toBeTruthy(); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('resends only after the countdown and supports editing the phone', async () => {
    render(<OtpLoginForm preventRedirect audience="business" />); expect(screen.getByRole('heading', { name: 'ورود به حساب کسب‌وکار' })).toBeTruthy(); await phone();
    expect((screen.getByRole('button', { name: /ارسال مجدد تا/ }) as HTMLButtonElement).disabled).toBe(true);
    await act(() => vi.advanceTimersByTime(2000)); await act(async () => fireEvent.click(screen.getByRole('button', { name: 'ارسال مجدد کد' })));
    expect(fetchMock).toHaveBeenCalledTimes(2); fireEvent.click(screen.getByRole('button', { name: 'ویرایش شماره' })); expect((screen.getByLabelText('شماره موبایل') as HTMLInputElement).value).toBe('09121111111');
  });
  it.each(['http', 'business', 'json', 'network'])('keeps phone entry available after %s request failure', async kind => {
    if (kind === 'network') fetchMock.mockRejectedValueOnce(new Error('offline'));
    else fetchMock.mockResolvedValueOnce({ ok: kind !== 'http', json: async () => { if (kind === 'json') throw new Error('json'); return { success: kind !== 'business', message: 'request failed' }; } });
    render(<OtpLoginForm preventRedirect />); await phone(); expect(screen.getByLabelText('شماره موبایل')).toBeTruthy();
    expect(screen.getByText(kind === 'network' ? 'خطا در برقراری ارتباط با سرور' : kind === 'json' ? 'خطا در ارسال کد تایید' : 'request failed')).toBeTruthy(); expect(state.setUser).not.toHaveBeenCalled();
  });
  it.each(['http', 'business', 'json', 'network'])('does not establish a session after %s verification failure', async kind => {
    render(<OtpLoginForm preventRedirect />); await phone();
    if (kind === 'network') fetchMock.mockRejectedValueOnce(new Error('offline'));
    else fetchMock.mockResolvedValueOnce({ ok: kind !== 'http', json: async () => { if (kind === 'json') throw new Error('json'); return { success: kind !== 'business', message: 'verify failed' }; } });
    await verify(); expect(screen.getByText(kind === 'network' ? 'خطا در تایید کد' : kind === 'json' ? 'کد تایید اشتباه است' : 'verify failed')).toBeTruthy(); expect(state.setUser).not.toHaveBeenCalled(); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each(['unauthenticated', 'missing-user', 'http', 'json'])('rejects an OTP success when persisted session is %s', async kind => {
    const success = vi.fn(); render(<OtpLoginForm preventRedirect onSuccess={success} />); await phone();
    fetchMock.mockResolvedValueOnce(ok({ success: true })).mockResolvedValueOnce({ ok: kind !== 'http', json: async () => {
      if (kind === 'json') throw new Error('json'); return { authenticated: kind !== 'unauthenticated', user: kind === 'missing-user' ? null : { id: 'user' } };
    } }); await verify(); expect(success).not.toHaveBeenCalled();
    expect(screen.getByText(kind === 'http' ? 'خطا در تایید کد' : /ورود ذخیره نشد/)).toBeTruthy();
  });

  it('renders account-not-found notice and allows switching to register mode', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'حساب کاربری با این شماره یافت نشد. می‌توانید از بخش ثبت‌نام، حساب جدید بسازید.',
      }),
    });

    render(<OtpLoginForm preventRedirect />);
    fireEvent.change(screen.getByLabelText('شماره موبایل'), { target: { value: '۰۹۱۲۹۹۹۰۰۰۰' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'دریافت کد تایید' })));

    expect(screen.getByText('حساب کاربری با این شماره یافت نشد')).toBeTruthy();
    const switchButton = screen.getByRole('button', { name: /ثبت‌نام با همین شماره/ });
    expect(switchButton).toBeTruthy();

    await act(async () => fireEvent.click(switchButton));
    expect(screen.getByRole('heading', { name: 'ثبت‌نام در لقمه' })).toBeTruthy();
    expect((screen.getByLabelText('شماره موبایل') as HTMLInputElement).value).toBe('09129990000');
  });

  it('allows manual switching between login and register tabs', async () => {
    render(<OtpLoginForm preventRedirect />);
    expect(screen.getByRole('heading', { name: 'ورود به حساب کاربری' })).toBeTruthy();

    const registerTab = screen.getByRole('button', { name: 'ثبت‌نام' });
    await act(async () => fireEvent.click(registerTab));
    expect(screen.getByRole('heading', { name: 'ثبت‌نام در لقمه' })).toBeTruthy();

    const loginTab = screen.getByRole('button', { name: 'ورود' });
    await act(async () => fireEvent.click(loginTab));
    expect(screen.getByRole('heading', { name: 'ورود به حساب کاربری' })).toBeTruthy();
  });
});

