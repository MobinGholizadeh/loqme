// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
const installEvent = (outcome = 'accepted', fail = false) => {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn().mockImplementation(async () => { if (fail) throw new Error('unavailable'); });
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  act(() => { window.dispatchEvent(event); }); return { event, prompt };
};
beforeEach(() => {
  vi.useFakeTimers(); nav.pathname = '/'; localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Chrome');
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('PWA installation lifecycle', () => {
  it.each(['accepted', 'dismissed'])('consumes the browser event after it is %s without leaving a dead install button', async outcome => {
    render(<PwaInstallPrompt />); const { event, prompt } = installEvent(outcome);
    expect(event.defaultPrevented).toBe(true); await act(async () => fireEvent.click(screen.getByRole('button', { name: 'نصب' })));
    expect(prompt).toHaveBeenCalledOnce(); expect(screen.queryByRole('complementary')).toBeNull();
    expect(localStorage.getItem('loqme_pwa_dismissed')).toBe(outcome === 'accepted' ? 'true' : null);
    installEvent(); expect(Boolean(screen.queryByRole('complementary'))).toBe(outcome !== 'accepted');
  });
  it('handles rejected prompt calls and waits for another browser event', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {}); render(<PwaInstallPrompt />); installEvent('dismissed', true);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'نصب' })));
    expect(warning).toHaveBeenCalled(); expect(screen.queryByRole('complementary')).toBeNull(); installEvent(); expect(screen.getByRole('complementary')).toBeTruthy();
  });
  it('continues functioning when privacy settings block local storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<PwaInstallPrompt />); installEvent(); await act(async () => fireEvent.click(screen.getByRole('button', { name: 'نصب' })));
    expect(screen.queryByRole('complementary')).toBeNull();
  });
  it('remembers explicit dismissal and removes event listeners on unmount', () => {
    const view = render(<PwaInstallPrompt />); installEvent(); fireEvent.click(screen.getByRole('button', { name: 'بستن اعلان' }));
    expect(localStorage.getItem('loqme_pwa_dismissed')).toBe('true'); installEvent(); expect(screen.queryByRole('complementary')).toBeNull();
    view.unmount(); expect(installEvent().event.defaultPrevented).toBe(false);
  });
  it.each(['standalone', 'dismissed'])('does not intercept browser install events when already %s', state => {
    if (state === 'standalone') vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    else localStorage.setItem('loqme_pwa_dismissed', 'true');
    render(<PwaInstallPrompt />); expect(installEvent().event.defaultPrevented).toBe(false); expect(screen.queryByRole('complementary')).toBeNull();
  });
  it.each(['/checkout/hold', '/listings/one', '/orders', '/merchant', '/admin', '/login', '/business'])('keeps installation out of %s', pathname => {
    nav.pathname = pathname; render(<PwaInstallPrompt />); installEvent(); expect(screen.queryByRole('complementary')).toBeNull();
  });
  it('provides the delayed iOS guide and supports closing and dismissing it', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone'); render(<PwaInstallPrompt />);
    expect(screen.queryByRole('complementary')).toBeNull(); act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole('button', { name: 'نصب' })); expect(screen.getByRole('dialog').textContent).toContain('Add to Home Screen');
    fireEvent.click(screen.getByRole('button', { name: 'بستن' })); expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'نصب' })); fireEvent.click(screen.getByRole('button', { name: 'متوجه شدم' }));
    expect(screen.queryByRole('complementary')).toBeNull(); expect(localStorage.getItem('loqme_pwa_dismissed')).toBe('true');
  });
  it('registers the production worker without using stale cached scripts', async () => {
    vi.stubEnv('NODE_ENV', 'production'); const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal('navigator', { userAgent: 'Chrome', serviceWorker: { register } });
    render(<PwaInstallPrompt />); await act(async () => {});
    expect(register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' });
  });
  it('cleans only Loqme development workers and caches', async () => {
    vi.stubEnv('NODE_ENV', 'development'); const own = vi.fn(), foreign = vi.fn(), removeCache = vi.fn();
    vi.stubGlobal('navigator', { userAgent: 'Chrome', serviceWorker: { getRegistrations: async () => [
      { active: { scriptURL: new URL('/sw.js', window.location.origin).href }, unregister: own },
      { waiting: { scriptURL: 'https://foreign.test/sw.js' }, unregister: foreign },
    ] } });
    vi.stubGlobal('caches', { keys: async () => ['loqme-cache-v1', 'other-app'], delete: removeCache });
    render(<PwaInstallPrompt />); await act(async () => {});
    expect(own).toHaveBeenCalledOnce(); expect(foreign).not.toHaveBeenCalled(); expect(removeCache).toHaveBeenCalledExactlyOnceWith('loqme-cache-v1');
  });
});
