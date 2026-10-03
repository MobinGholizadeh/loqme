// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CustomerPickupPassModal } from '@/components/pickup/CustomerPickupPassModal';
let fetchMock: ReturnType<typeof vi.fn>;
const credentials = (extra = {}) => ({ orderNumber: 'LQ-123', isVerified: false, otpCode: '1234', otpCodePersian: '۱۲۳۴', expiresInSeconds: 60, qrDataUrl: 'data:image/png;base64,AA', listingTitleFa: 'بسته', quantity: 2, pickupWindowFa: '۱۸ تا ۱۹', merchant: { businessNameFa: 'فروشگاه', addressFa: 'نشانی', phone: '09121111111', directionsUrl: 'https://example.org/map' }, ...extra });
const response = (data = credentials(), ok = true) => ({ ok, json: async () => ({ success: true, data }) });
beforeEach(() => {
  vi.useFakeTimers(); fetchMock = vi.fn().mockResolvedValue(response()); vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('Customer pickup pass lifecycle', () => {
  it('loads the requested order, supports contrast/copy and renders merchant actions', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('navigator', { clipboard: { writeText } }); const close = vi.fn();
    render(<CustomerPickupPassModal orderId="order" isOpen onClose={close} />); await act(async () => {});
    expect(fetchMock).toHaveBeenCalledWith('/api/pickup/credentials/order'); expect(screen.getByAltText('بارکد تحویل حضوری')).toBeTruthy();
    expect(screen.getByRole('link', { name: /تماس/ }).getAttribute('href')).toBe('tel:09121111111'); expect(screen.getByRole('link', { name: /مسیریابی/ }).getAttribute('href')).toBe('https://example.org/map');
    fireEvent.click(screen.getByRole('switch')); expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'کپی کد' }))); expect(writeText).toHaveBeenCalledWith('1234'); expect(screen.getByText('کپی شد')).toBeTruthy();
    await act(() => vi.advanceTimersByTime(2000)); expect(screen.queryByText('کپی شد')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'بستن' })); expect(close).toHaveBeenCalled();
  });
  it.each(['http', 'business', 'network'])('rejects %s failure and recovers with retry', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('offline'));
    else if (failure === 'http') fetchMock.mockResolvedValueOnce(response(credentials(), false));
    else fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, message: 'ناموفق' }) });
    render(<CustomerPickupPassModal orderId="order" isOpen onClose={vi.fn()} />); await act(async () => {});
    expect(screen.queryByAltText('بارکد تحویل حضوری')).toBeNull(); await act(async () => fireEvent.click(screen.getByRole('button', { name: 'تلاش مجدد' })));
    expect(screen.getByAltText('بارکد تحویل حضوری')).toBeTruthy();
  });
  it('does not show another order’s credentials when old responses arrive late', async () => {
    let resolveOld!: (value: unknown) => void; fetchMock.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const close = vi.fn(); const view = render(<CustomerPickupPassModal orderId="old" isOpen onClose={close} />);
    view.rerender(<CustomerPickupPassModal orderId="new" isOpen onClose={close} />); await act(async () => {});
    await act(async () => resolveOld(response(credentials({ orderNumber: 'OLD-ORDER' }))));
    expect(screen.queryByText('OLD-ORDER')).toBeNull(); expect(screen.getByText('LQ-123')).toBeTruthy();
  });
  it('polls for pickup completion and stops polling once verified', async () => {
    const verified = vi.fn(), close = vi.fn(); render(<CustomerPickupPassModal orderId="order" isOpen onClose={close} onVerified={verified} />); await act(async () => {});
    fetchMock.mockResolvedValue(response(credentials({ isVerified: true, verifiedAt: '2026-10-03T12:00:00Z' })));
    await act(() => vi.advanceTimersByTime(4000)); expect(screen.getByText('نوش جان!')).toBeTruthy(); expect(verified).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTime(10000)); expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'متشکرم' })); expect(close).toHaveBeenCalled();
  });
  it('refreshes short-lived proof and removes timers when closed', async () => {
    fetchMock.mockResolvedValue(response(credentials({ expiresInSeconds: 1 }))); const close = vi.fn();
    const view = render(<CustomerPickupPassModal orderId="order" isOpen onClose={close} />); await act(async () => {});
    await act(() => vi.advanceTimersByTime(1000)); expect(fetchMock).toHaveBeenCalledTimes(2);
    view.rerender(<CustomerPickupPassModal orderId="order" isOpen={false} onClose={close} />);
    await act(() => vi.advanceTimersByTime(10000)); expect(fetchMock).toHaveBeenCalledTimes(2); expect(screen.queryByRole('dialog')).toBeNull();
  });
  it.each(['missing', 'denied'])('keeps the readable OTP available when clipboard is %s', async state => {
    vi.stubGlobal('navigator', state === 'missing' ? {} : { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<CustomerPickupPassModal orderId="order" isOpen onClose={vi.fn()} />); await act(async () => {});
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'کپی کد' })));
    expect(screen.getByText('۱۲۳۴')).toBeTruthy(); expect(screen.queryByText('کپی شد')).toBeNull();
  });
});
