// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NotificationsModal } from '@/components/profile/NotificationsModal';
import { SettingsModal } from '@/components/profile/SettingsModal';
const notificationKey = 'loqme-user-notifications-v1';
const settingsKey = 'loqme-user-settings-v1';
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('Notification truth and interactions', () => {
  it.each([null, '[]', '{broken', '{}'])('does not fabricate orders or discounts when storage is %s', saved => {
    if (saved !== null) localStorage.setItem(notificationKey, saved);
    const unread = vi.fn(); render(<NotificationsModal isOpen onClose={() => {}} onUnreadCountChange={unread} />);
    expect(screen.getByText('اعلانی وجود ندارد')).toBeTruthy(); expect(unread).toHaveBeenLastCalledWith(0);
    expect((screen.getByRole('button', { name: /علامت‌گذاری همه/ }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('drops legacy fabricated notifications persisted by earlier versions', () => {
    localStorage.setItem(notificationKey, JSON.stringify([{ id: 'notif-1', title: 'سفارش ساختگی', body: 'fake', time: 'now', read: false, type: 'order' }]));
    render(<NotificationsModal isOpen onClose={() => {}} />); expect(screen.queryByText('سفارش ساختگی')).toBeNull(); expect(screen.getByText('اعلانی وجود ندارد')).toBeTruthy();
  });
  it('filters saved notifications and marks individual or all notifications read', () => {
    const items = ['order', 'discount', 'system'].map((type, i) => ({ id: `saved-${i}`, title: `message-${i}`, body: 'body', time: 'now', read: i === 2, type, ...(i === 0 ? { link: '/orders' } : {}) }));
    localStorage.setItem(notificationKey, JSON.stringify(items)); const close = vi.fn(); const unread = vi.fn(); render(<NotificationsModal isOpen onClose={close} onUnreadCountChange={unread} />);
    expect(unread).toHaveBeenLastCalledWith(2); fireEvent.click(screen.getByRole('button', { name: 'سفارش‌ها' })); expect(screen.getByText('message-0')).toBeTruthy(); expect(screen.queryByText('message-1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'تخفیف‌ها' })); fireEvent.click(screen.getByText('message-1')); expect(close).toHaveBeenCalledOnce(); expect(unread).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'کسب‌وکار' })); expect(screen.getByText('message-2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /همه \(/ })); fireEvent.click(screen.getByRole('button', { name: /علامت‌گذاری همه/ }));
    expect(unread).toHaveBeenLastCalledWith(0); expect(JSON.parse(localStorage.getItem(notificationKey)!).every((item: any) => item.read)).toBe(true);
  });
  it('still updates the current list when browser storage is blocked', () => {
    localStorage.setItem(notificationKey, JSON.stringify([{ id: 'saved', title: 'notice', body: '', time: '', type: 'system', read: false }]));
    render(<NotificationsModal isOpen onClose={() => {}} />); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    fireEvent.click(screen.getByRole('button', { name: /علامت‌گذاری همه/ })); expect((screen.getByRole('button', { name: /علامت‌گذاری همه/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
describe('Local account preference controls', () => {
  it('loads saved values, edits every preference and saves trimmed names', async () => {
    vi.useFakeTimers(); localStorage.setItem(settingsKey, JSON.stringify({ fullName: 'saved', smsOrders: false, surplusAlerts: false, autoLocation: false }));
    const close = vi.fn(); const update = vi.fn(); render(<SettingsModal isOpen onClose={close} initialUser={{ fullName: 'server', mobile: '09121111111' }} onUserUpdate={update} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('saved'); expect(screen.getAllByRole('checkbox').every(c => !(c as HTMLInputElement).checked)).toBe(true);
    screen.getAllByRole('checkbox').forEach(c => fireEvent.click(c)); fireEvent.change(screen.getByRole('textbox'), { target: { value: '  new name  ' } }); fireEvent.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }));
    expect(JSON.parse(localStorage.getItem(settingsKey)!)).toEqual({ fullName: 'new name', smsOrders: true, surplusAlerts: true, autoLocation: true }); expect(update).toHaveBeenCalledWith({ fullName: 'new name' });
    expect(screen.getByText('ذخیره شد!')).toBeTruthy(); await act(() => vi.advanceTimersByTime(900)); expect(close).toHaveBeenCalledOnce();
  });
  it('ignores malformed preferences, supports form submission and clears temporary storage', async () => {
    vi.useFakeTimers(); localStorage.setItem(settingsKey, '{broken'); sessionStorage.setItem('draft', 'value');
    const update = vi.fn(); const view = render(<SettingsModal isOpen onClose={() => {}} onUserUpdate={update} />);
    fireEvent.click(screen.getByRole('button', { name: 'پاک‌سازی' })); expect(sessionStorage.length).toBe(0); expect(screen.getByText('پاک شد')).toBeTruthy();
    await act(() => vi.advanceTimersByTime(2000)); expect(screen.getByRole('button', { name: 'پاک‌سازی' })).toBeTruthy();
    fireEvent.submit(view.baseElement.querySelector('form')!); expect(update).not.toHaveBeenCalled();
  });
  it('keeps controls usable when local storage operations fail', () => {
    vi.useFakeTimers(); vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); }); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); }); vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => { throw new Error('denied'); });
    const close = vi.fn(); render(<SettingsModal isOpen onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'پاک‌سازی' })); fireEvent.click(screen.getByRole('button', { name: 'ذخیره تغییرات' })); fireEvent.click(screen.getByRole('button', { name: 'انصراف' })); expect(close).toHaveBeenCalledOnce();
  });
});
