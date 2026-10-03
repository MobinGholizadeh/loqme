// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from '@/components/auth/SessionProvider';
const clear = vi.hoisted(() => vi.fn());
vi.mock('@/lib/business/draft', () => ({ clearBusinessDraft: clear }));
const user = { userId: 'customer', mobile: '09121111111', role: 'CUSTOMER' as const };
function Consumer() {
  const session = useSession();
  return <><output>{session.status}</output><span>{session.user?.mobile}</span><button onClick={() => void session.refresh()}>Refresh</button><button onClick={() => session.setUser(user)}>Login</button><button onClick={() => session.setUser(null)}>Logout</button></>;
}
describe('Client session state and request races', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('requires the provider', () => { vi.spyOn(console, 'error').mockImplementation(() => {}); expect(() => render(<Consumer />)).toThrow('SessionProvider is required'); });
  it('loads the session without caching and clears drafts on confirmed logout', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ authenticated: true, user })).mockResolvedValueOnce(Response.json({ authenticated: false }));
    render(<SessionProvider><Consumer /></SessionProvider>);
    await screen.findByText('authenticated'); expect(screen.getByText(user.mobile)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', { cache: 'no-store' });
    fireEvent.click(screen.getByText('Refresh')); await screen.findByText('anonymous'); expect(clear).toHaveBeenCalledOnce();
  });
  it('does not erase a known session on a network or HTTP failure', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ authenticated: true, user })).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response('', { status: 503 }));
    render(<SessionProvider><Consumer /></SessionProvider>); await screen.findByText('authenticated');
    await act(async () => { fireEvent.click(screen.getByText('Refresh')); });
    expect(screen.getByText('authenticated')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByText('Refresh')); });
    expect(screen.getByText(user.mobile)).toBeTruthy(); expect(clear).not.toHaveBeenCalled();
  });
  it('reports initial unavailability without pretending the user is logged out', async () => {
    fetchMock.mockRejectedValue(new Error('offline')); render(<SessionProvider><Consumer /></SessionProvider>);
    await screen.findByText('unavailable'); expect(clear).not.toHaveBeenCalled();
  });
  it('ignores stale anonymous results after login and stale failures after logout', async () => {
    let resolve!: (value: Response) => void; let reject!: (error: Error) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(r => { resolve = r; })).mockImplementationOnce(() => new Promise<Response>((_, r) => { reject = r; }));
    render(<SessionProvider><Consumer /></SessionProvider>);
    fireEvent.click(screen.getByText('Login'));
    await act(async () => { resolve(Response.json({ authenticated: false })); });
    expect(screen.getByText('authenticated')).toBeTruthy();
    fireEvent.click(screen.getByText('Refresh')); fireEvent.click(screen.getByText('Logout'));
    await act(async () => { reject(new Error('offline')); });
    expect(screen.getByText('anonymous')).toBeTruthy(); expect(clear).toHaveBeenCalledOnce();
  });
  it('refreshes only visible tabs and removes event listeners on unmount', async () => {
    fetchMock.mockImplementation(async () => Response.json({ authenticated: false }));
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const { unmount } = render(<SessionProvider><Consumer /></SessionProvider>); await screen.findByText('anonymous');
    fireEvent.focus(window); expect(fetchMock).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue('visible'); fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    unmount(); fireEvent.focus(window); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
