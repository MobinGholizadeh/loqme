import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { verify } = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock('@/domain/order/order.service', () => ({ orderService: { verifyAndCompleteOrder: verify } }));
import { GET, POST } from '@/app/api/payments/verify/route';

describe('Payment callback redirects and API responses', () => {
  const request = (query = '') => new NextRequest(`https://shop.test/api/payments/verify${query}`);
  const post = (body: unknown, headers = {}) => new NextRequest('https://shop.test/api/payments/verify', { method: 'POST', headers, body: JSON.stringify(body) });
  const redirect = async (query: string) => new URL((await GET(request(query))).headers.get('location')!);
  beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {});
    verify.mockResolvedValue({ success: true, order: { id: 'order', status: 'READY_FOR_PICKUP' }, orderNumber: 'LQ-1', referenceId: 'REF' });
  });
  afterEach(() => vi.restoreAllMocks());
  it('rejects missing authority without contacting the gateway', async () => {
    expect((await redirect('')).searchParams.get('error')).toBe('missing_authority'); expect(verify).not.toHaveBeenCalled();
  });
  it.each(['NOK', 'cancelled'])('preserves the authority as one query value for cancellation %s', async status => {
    const url = await redirect(`?Authority=${encodeURIComponent('A&error=injected#fragment')}&Status=${status}`);
    expect(url.pathname).toBe('/explore'); expect(url.searchParams.get('error')).toBe('payment_cancelled');
    expect(url.searchParams.get('authority')).toBe('A&error=injected#fragment'); expect(url.hash).toBe(''); expect(verify).not.toHaveBeenCalled();
  });
  it.each(['Authority', 'authority', 'trackId'])('verifies the %s alias and redirects to its receipt', async key => {
    const url = await redirect(`?${key}=AUTH&status=OK&trackingCode=TRACK`);
    expect(verify).toHaveBeenCalledWith({ authority: 'AUTH', trackingCode: 'TRACK', ipAddress: '127.0.0.1' });
    expect(url.pathname).toBe('/orders/order/receipt'); expect(url.searchParams.get('status')).toBe('success'); expect(url.searchParams.get('ref')).toBe('REF');
  });
  it('omits missing references and takes the first forwarded address', async () => {
    verify.mockResolvedValue({ success: true, order: { id: 'order' } });
    const response = await GET(new NextRequest('https://shop.test/api/payments/verify?authority=AUTH', { headers: { 'x-forwarded-for': '192.0.2.1, 127.0.0.1' } }));
    expect(new URL(response.headers.get('location')!).searchParams.has('ref')).toBe(false);
    expect(verify).toHaveBeenCalledWith(expect.objectContaining({ ipAddress: '192.0.2.1' }));
  });
  it.each([undefined, 'declined'])('uses the order list when failed verification has no order (%s)', async message => {
    verify.mockResolvedValue({ success: false, message });
    const url = await redirect('?authority=AUTH');
    expect(url.pathname).toBe('/orders'); expect(url.searchParams.get('status')).toBe('failed'); expect(url.searchParams.get('msg')).toBeTruthy();
  });
  it('uses the known receipt on failure and recovers from server errors', async () => {
    verify.mockResolvedValueOnce({ success: false, order: { id: 'order' }, message: 'declined' }).mockRejectedValueOnce(new Error('offline'));
    expect((await redirect('?authority=AUTH')).pathname).toBe('/orders/order/receipt');
    expect((await redirect('?authority=AUTH')).searchParams.get('error')).toBe('server_error');
  });
  it('validates webhook input and returns failure without publishing a receipt', async () => {
    expect((await POST(post({ authority: '' }))).status).toBe(400); expect(verify).not.toHaveBeenCalled();
    verify.mockResolvedValue({ success: false, message: 'declined' }); expect((await POST(post({ authority: 'AUTH' }))).status).toBe(400);
  });
  it.each([{}, { 'x-forwarded-for': '192.0.2.2, 127.0.0.1' }])('returns the verified order and forwards tracking data', async headers => {
    const response = await POST(post({ authority: 'AUTH', trackingCode: 'TRACK' }, headers));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ success: true, data: { orderId: 'order', referenceId: 'REF', status: 'READY_FOR_PICKUP' } });
    expect(verify).toHaveBeenCalledWith({ authority: 'AUTH', trackingCode: 'TRACK', ipAddress: headers['x-forwarded-for'] ? '192.0.2.2' : '127.0.0.1' });
  });
  it('returns a generic server failure without leaking provider details', async () => {
    verify.mockRejectedValue(new Error('private provider detail'));
    const response = await POST(post({ authority: 'AUTH' })); expect(response.status).toBe(500); expect(await response.text()).not.toContain('private provider detail');
  });
});
