// Unit-test route contracts independently; real JWT-to-RLS binding is covered in rls.integration.test.ts.
vi.mock('@/lib/db/request', () => ({ withDatabaseRequest: (handler: unknown) => handler }));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { auth, orders, holds, db } = vi.hoisted(() => ({
  auth: { extractSessionToken: vi.fn(), verifySessionToken: vi.fn() },
  orders: { listCustomerOrders: vi.fn(), getOrderById: vi.fn(), createOrderFromReservation: vi.fn() },
  holds: { createReservation: vi.fn(), getReservation: vi.fn(), cancelReservation: vi.fn() },
  db: { customer: { findUnique: vi.fn(), create: vi.fn() } },
}));
vi.mock('@/lib/auth/session', () => auth);
vi.mock('@/domain/order/order.service', () => ({ orderService: orders }));
vi.mock('@/domain/reservation/reservation.service', () => ({ reservationService: holds }));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
import { GET as listOrders } from '@/app/api/orders/route';
import { GET as getOrder } from '@/app/api/orders/[id]/route';
import { POST as checkout } from '@/app/api/orders/checkout/route';
import { POST as reserve } from '@/app/api/reservations/route';
import { GET as getReservation, DELETE as cancel } from '@/app/api/reservations/[id]/route';

describe('Customer order and reservation API boundaries', () => {
  const params = { params: Promise.resolve({ id: 'record' }) };
  const request = (method = 'GET', body?: unknown) => new NextRequest('http://localhost/api/orders/record', { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const now = new Date();
  const reservation = () => ({ id: 'record', customerId: 'customer', listingId: 'listing', quantity: 2, status: 'PENDING', expiresAt: now, remainingSeconds: 60, isExpired: false,
    listing: { id: 'listing', titleFa: 'بسته', originalPriceToman: 100n, discountedPriceToman: 50n, pickupStart: now, pickupEnd: now, merchant: { businessNameFa: 'کافه', locations: [{ addressFa: 'نشانی' }] } } });
  beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.extractSessionToken.mockReturnValue('token'); auth.verifySessionToken.mockResolvedValue({ userId: 'user', mobile: '09121111111', fullName: 'نام', role: 'CUSTOMER' });
    db.customer.findUnique.mockResolvedValue({ id: 'customer' }); db.customer.create.mockResolvedValue({ id: 'customer' });
    orders.listCustomerOrders.mockResolvedValue([{ id: 'order' }]); orders.getOrderById.mockResolvedValue({ id: 'order' });
    holds.getReservation.mockResolvedValue(reservation()); holds.cancelReservation.mockResolvedValue({ success: true, message: 'cancelled' });
    holds.createReservation.mockResolvedValue({ success: true, reservation: { id: 'hold' } });
    orders.createOrderFromReservation.mockResolvedValue({ success: true, order: { id: 'order', orderNumber: 'LQ-1', totalAmountToman: 100n }, authority: 'AUTH', paymentUrl: '/pay' });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  it('selects the real gateway server-side for production checkout', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await checkout(request('POST', { reservationId: 'hold', termsAccepted: true, gateway: 'MOCK' }));
    expect(response.status).toBe(200);
    expect(orders.createOrderFromReservation).toHaveBeenCalledWith(expect.objectContaining({ gateway: 'ZARINPAL' }));
    expect(await response.json()).toMatchObject({ data: { gateway: 'ZARINPAL' } });
  });
  const reads = [['list orders', listOrders], ['order details', (r: NextRequest) => getOrder(r, params)], ['reservation details', (r: NextRequest) => getReservation(r, params)]] as const;
  describe.each(reads)('%s', (_, handler) => {
    it('requires authentication and a customer profile', async () => {
      auth.extractSessionToken.mockReturnValueOnce(null); expect((await handler(request())).status).toBe(401);
      auth.verifySessionToken.mockResolvedValueOnce(null); expect((await handler(request())).status).toBe(401);
      db.customer.findUnique.mockResolvedValue(null); expect((await handler(request())).status).toBe(404);
      expect(orders.getOrderById).not.toHaveBeenCalled(); expect(holds.getReservation).not.toHaveBeenCalled();
    });
    it('returns a successful response to the owner', async () => { expect((await handler(request())).status).toBe(200); });
    it('returns a safe error if the backing query fails', async () => { db.customer.findUnique.mockRejectedValue(new Error('offline')); expect((await handler(request())).status).toBe(500); });
  });
  it('passes the authenticated customer ID to order retrieval and conceals absent/foreign records', async () => {
    await getOrder(request(), params); expect(orders.getOrderById).toHaveBeenCalledWith('record', 'customer');
    orders.getOrderById.mockResolvedValue(null); expect((await getOrder(request(), params)).status).toBe(404);
  });
  it('does not expose another customer reservation and serializes only owned reservation values', async () => {
    holds.getReservation.mockResolvedValueOnce({ ...reservation(), customerId: 'another' }).mockResolvedValueOnce(null);
    expect((await getReservation(request(), params)).status).toBe(404); expect((await getReservation(request(), params)).status).toBe(404);
    const response = await getReservation(request(), params);
    expect(await response.json()).toMatchObject({ data: { quantity: 2, listing: { totalPriceToman: 100, savingsToman: 100, addressFa: 'نشانی' } } });
    const value = reservation(); value.listing.merchant.locations = []; holds.getReservation.mockResolvedValue(value);
    expect((await getReservation(request(), params)).status).toBe(200);
  });
  it.each([['reserve', reserve, { listingId: 'listing', quantity: 2 }], ['checkout', checkout, { reservationId: 'hold', termsAccepted: true }], ['cancel', (r: NextRequest) => cancel(r, params), undefined]] as const)('authenticates %s writes and handles failures', async (_, handler, body) => {
    auth.extractSessionToken.mockReturnValueOnce(null); expect((await handler(request('POST', body))).status).toBe(401);
    auth.verifySessionToken.mockResolvedValueOnce(null); expect((await handler(request('POST', body))).status).toBe(401);
    db.customer.findUnique.mockRejectedValueOnce(new Error('offline')); expect((await handler(request('POST', body))).status).toBe(500);
    expect((await handler(request('POST', body))).status).toBe(200);
  });
  it('uses server identity and validated quantity when creating a reservation', async () => {
    db.customer.findUnique.mockResolvedValueOnce(null);
    expect((await reserve(request('POST', { listingId: 'listing', quantity: 2, customerId: 'attacker', price: 1 }))).status).toBe(200);
    expect(holds.createReservation).toHaveBeenCalledWith({ listingId: 'listing', quantity: 2, customerId: 'customer' });
    expect((await reserve(request('POST', { quantity: -1 }))).status).toBe(400);
    holds.createReservation.mockResolvedValue({ success: false, message: 'sold out' }); expect((await reserve(request('POST', { listingId: 'listing' }))).status).toBe(400);
  });
  it('requires a checkout profile, accepted terms, and successful gateway initiation', async () => {
    db.customer.findUnique.mockResolvedValueOnce(null); expect((await checkout(request('POST', { reservationId: 'hold', termsAccepted: true }))).status).toBe(404);
    expect((await checkout(request('POST', { reservationId: 'hold', termsAccepted: false }))).status).toBe(400);
    orders.createOrderFromReservation.mockResolvedValueOnce({ success: false, message: 'gateway failed' }); expect((await checkout(request('POST', { reservationId: 'hold', termsAccepted: true }))).status).toBe(400);
    const response = await checkout(new NextRequest('https://shop.test/api/orders/checkout', { method: 'POST', headers: { host: 'shop.test', 'x-forwarded-proto': 'https' }, body: JSON.stringify({ reservationId: 'hold', termsAccepted: true }) }));
    expect(await response.json()).toMatchObject({ data: { totalAmountToman: 100 } });
    expect(orders.createOrderFromReservation).toHaveBeenLastCalledWith(expect.objectContaining({ customerId: 'customer', callbackUrl: 'https://shop.test/api/payments/verify' }));
  });
  it('cancels only with a customer profile and propagates rejected cancellations', async () => {
    db.customer.findUnique.mockResolvedValueOnce(null); expect((await cancel(request('DELETE'), params)).status).toBe(404);
    holds.cancelReservation.mockResolvedValueOnce({ success: false, message: 'not owned' }); expect((await cancel(request('DELETE'), params)).status).toBe(400);
    expect(holds.cancelReservation).toHaveBeenCalledWith('record', 'customer');
  });
});
