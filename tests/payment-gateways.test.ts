import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZarinpalGatewayAdapter } from '@/domain/payment/zarinpal.gateway';
import { MockPaymentGateway } from '@/domain/payment/mock.gateway';

const initiation = { orderId: 'order-1', orderNumber: 'LQ-1', amountToman: 25000, callbackUrl: 'https://shop.test/callback', description: 'خرید', mobile: '09121111111' };
describe('Payment gateway response boundaries', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it.each([false, true])('sends correct initiation fields in sandbox=%s', async sandbox => {
    vi.stubEnv('NODE_ENV', 'production');
    fetchMock.mockResolvedValue(Response.json({ data: { code: 100, authority: 'A123' } }));
    const result = await new ZarinpalGatewayAdapter('merchant-1', sandbox).initiatePayment(initiation);
    expect(result).toMatchObject({ success: true, authority: 'A123', gateway: 'ZARINPAL' });
    expect(result.paymentUrl).toBe(`https://${sandbox ? 'sandbox' : 'www'}.zarinpal.com/pg/StartPay/A123`);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://${sandbox ? 'sandbox' : 'api'}.zarinpal.com/pg/v4/payment/request.json`);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ merchant_id: 'merchant-1', amount: 25000, currency: 'IRT', callback_url: initiation.callbackUrl, metadata: { order_id: 'order-1' } });
  });

  it('uses the environment merchant ID and non-production sandbox', async () => {
    vi.stubEnv('ZARINPAL_MERCHANT_ID', 'environment-id'); vi.stubEnv('NODE_ENV', 'test');
    fetchMock.mockResolvedValue(Response.json({ data: { code: 100, authority: 'A' } }));
    await new ZarinpalGatewayAdapter().initiatePayment(initiation);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).merchant_id).toBe('environment-id');
    expect(fetchMock.mock.calls[0][0]).toContain('sandbox');
  });

  it.each([{ errors: { message: 'Rejected' } }, { data: { code: -1 } }, {}])('rejects unsuccessful initiation responses: %j', async payload => {
    fetchMock.mockResolvedValue(Response.json(payload));
    expect(await new ZarinpalGatewayAdapter().initiatePayment(initiation)).toMatchObject({ success: false, authority: '', paymentUrl: '', errorMessage: expect.any(String) });
  });

  it.each([100, 101])('accepts verified/already-verified code %s and preserves receipt', async code => {
    fetchMock.mockResolvedValue(Response.json({ data: { code, ref_id: 123, card_pan: 'masked', fee: 42 } }));
    const result = await new ZarinpalGatewayAdapter().verifyPayment({ authority: 'A', amountToman: 25000 });
    expect(result).toMatchObject({ success: true, referenceId: '123', feeToman: 42 });
    expect(JSON.stringify(result)).not.toContain('masked');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ amount: 25000, authority: 'A' });
  });

  it('does not approve a response missing its authoritative receipt', async () => {
    fetchMock.mockResolvedValue(Response.json({ data: { code: 100 } }));
    expect(await new ZarinpalGatewayAdapter().verifyPayment({ authority: 'A', amountToman: 1 })).toMatchObject({ success: false, outcome: 'UNKNOWN' });
  });

  it.each([{ errors: { message: 'Declined' } }, { data: { code: -21 } }, {}])('rejects unsuccessful verification: %j', async payload => {
    fetchMock.mockResolvedValue(Response.json(payload));
    expect(await new ZarinpalGatewayAdapter().verifyPayment({ authority: 'A', amountToman: 1 })).toMatchObject({ success: false, errorMessage: expect.any(String) });
  });

  it.each(['network', 'invalid-json'])('reports %s failures without approving a payment', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('offline'));
    else fetchMock.mockImplementation(async () => new Response('not-json'));
    const gateway = new ZarinpalGatewayAdapter();
    expect((await gateway.initiatePayment(initiation)).success).toBe(false);
    expect((await gateway.verifyPayment({ authority: 'A', amountToman: 1 })).success).toBe(false);
  });

  it.each([500, 502])('never treats HTTP %s as payment success even with a success-looking body', async status => {
    fetchMock.mockImplementation(async () => Response.json({ data: { code: 100, authority: 'A', ref_id: 1 } }, { status }));
    const gateway = new ZarinpalGatewayAdapter();
    expect((await gateway.initiatePayment(initiation)).success).toBe(false);
    expect((await gateway.verifyPayment({ authority: 'A', amountToman: 1 })).success).toBe(false);
  });
});

describe('Local mock payment gateway', () => {
  it.each(['https://local.test/callback', 'https://local.test/callback?order=1'])('preserves callback parameters for %s', async callbackUrl => {
    const result = await new MockPaymentGateway().initiatePayment({ ...initiation, callbackUrl });
    const url = new URL(result.paymentUrl);
    expect(url.searchParams.get('authority')).toBe(result.authority);
    expect(url.searchParams.get('status')).toBe('OK');
    expect(result.authority).toMatch(/^MOCK-AUTH-/);
    if (callbackUrl.includes('?')) expect(url.searchParams.get('order')).toBe('1');
  });
  it.each(['', 'INVALID'])('rejects invalid mock authority %s', async authority => {
    expect((await new MockPaymentGateway().verifyPayment({ authority, amountToman: 1 })).success).toBe(false);
  });
  it.each([0, -1, NaN, Infinity, 1.5])('rejects invalid amount %s', async amountToman => {
    expect((await new MockPaymentGateway().verifyPayment({ authority: 'MOCK-A', amountToman })).success).toBe(false);
  });
  it('returns traceable verification and refund data', async () => {
    const gateway = new MockPaymentGateway();
    const verified = await gateway.verifyPayment({ authority: 'MOCK-A', amountToman: 100 });
    expect(verified).toMatchObject({ success: true, referenceId: expect.stringMatching(/^REF-/), trackingCode: expect.stringMatching(/^TRK-/), rawPayload: { amountToman: 100 } });
    expect(await gateway.refundPayment({ authority: 'MOCK-A', amountToman: 100, reason: 'cancelled' })).toMatchObject({ success: true, refundId: expect.stringMatching(/^REFUND-/), rawPayload: { reason: 'cancelled' } });
  });
});
