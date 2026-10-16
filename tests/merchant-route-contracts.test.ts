import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  auth: { extractSessionToken: vi.fn(), verifySessionToken: vi.fn() },
  merchant: { getDashboardStats: vi.fn(), getFinanceSummary: vi.fn(), getStaffList: vi.fn(), addStaffMember: vi.fn(), removeStaffMember: vi.fn(), getStoreSettings: vi.fn(), updateStoreSettings: vi.fn(), resolveMerchantAndAuthorize: vi.fn() },
  listing: { getMerchantListings: vi.fn(), createListing: vi.fn(), toggleListingStatus: vi.fn(), adjustListingStock: vi.fn() },
  db: { category: { findUnique: vi.fn() } }, image: vi.fn(), pickup: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => mocks.auth);
vi.mock('@/domain/merchant/merchant.service', () => ({ merchantService: mocks.merchant }));
vi.mock('@/domain/listing/listing.service', () => ({ listingService: mocks.listing }));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.db }));
vi.mock('@/domain/listing/update-image', () => ({ updateListingImage: mocks.image }));
vi.mock('@/domain/listing/pickup-details', () => ({ updatePickupDetails: mocks.pickup, readPickupDetails: (value: unknown) => value }));
import * as dashboard from '@/app/api/merchant/dashboard/route';
import * as finance from '@/app/api/merchant/finance/route';
import * as staff from '@/app/api/merchant/staff/route';
import * as staffItem from '@/app/api/merchant/staff/[id]/route';
import * as settings from '@/app/api/merchant/settings/route';
import * as listings from '@/app/api/merchant/listings/route';
import * as listingItem from '@/app/api/merchant/listings/[id]/route';
const request = (path: string, method = 'GET', body?: unknown) => new NextRequest(`http://localhost/api/merchant/${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) });
const context = () => ({ params: Promise.resolve({ id: 'item' }) });
const listing = () => ({ id: 'item', merchantId: 'store', attributes: {}, images: [], category: { nameFa: 'نان' }, titleFa: 'بسته', originalPriceToman: 200n, discountedPriceToman: 100n, pickupDate: new Date(), createdAt: new Date(), status: 'PUBLISHED', inventory: { totalQuantity: 5, reservedQuantity: 1, soldQuantity: 2 } });
const validListing = () => ({ titleFa: 'بسته تازه', descriptionFa: 'توضیحات بسته تازه', categorySlug: 'bread', imageUrl: '/api/listing-images/store/photo', originalPriceToman: 200, discountedPriceToman: 100, quantity: 5 });
beforeEach(() => {
  vi.resetAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.auth.extractSessionToken.mockReturnValue('token'); mocks.auth.verifySessionToken.mockResolvedValue({ userId: 'owner', role: 'MERCHANT_OWNER' });
  for (const fn of Object.values(mocks.merchant)) fn.mockResolvedValue({ message: 'ok' });
  mocks.merchant.getStaffList.mockResolvedValue([]); mocks.merchant.resolveMerchantAndAuthorize.mockResolvedValue({ merchant: { id: 'store', locations: [{ id: 'location' }] } });
  mocks.listing.getMerchantListings.mockResolvedValue([listing()]); mocks.listing.createListing.mockResolvedValue(listing()); mocks.listing.toggleListingStatus.mockResolvedValue(listing()); mocks.listing.adjustListingStock.mockResolvedValue(listing()); mocks.db.category.findUnique.mockResolvedValue({ id: 'category' });
});
afterEach(() => { vi.restoreAllMocks(); });
const routes = [
  ['dashboard', 'GET', dashboard.GET], ['finance', 'GET', finance.GET], ['staff', 'GET', staff.GET], ['staff', 'POST', staff.POST],
  ['staff/item', 'DELETE', staffItem.DELETE], ['settings', 'GET', settings.GET], ['settings', 'PUT', settings.PUT], ['listings', 'GET', listings.GET],
  ['listings', 'POST', listings.POST], ['listings/item', 'PATCH', listingItem.PATCH], ['listings/item', 'DELETE', listingItem.DELETE],
] as const;
describe.each(routes)('Merchant %s %s authentication', (path, method, handler) => {
  it.each(['missing', 'invalid'])('rejects %s sessions before accessing merchant data', async state => {
    if (state === 'missing') mocks.auth.extractSessionToken.mockReturnValue(null); else mocks.auth.verifySessionToken.mockResolvedValue(null);
    expect((await handler(request(path, method, method === 'GET' ? undefined : {}), context())).status).toBe(401);
    for (const fn of Object.values(mocks.merchant)) expect(fn).not.toHaveBeenCalled();
  });
});
describe('Merchant response and mutation contracts', () => {
  it.each([
    ['dashboard', dashboard.GET, 'getDashboardStats'], ['finance', finance.GET, 'getFinanceSummary'], ['settings', settings.GET, 'getStoreSettings'], ['staff', staff.GET, 'getStaffList'],
  ] as const)('scopes %s to the signed-in user and selected store', async (path, handler, method) => {
    expect((await handler(request(`${path}?merchantId=store`))).status).toBe(200); expect(mocks.merchant[method]).toHaveBeenCalledWith('owner', 'store');
    await handler(request(path)); expect(mocks.merchant[method]).toHaveBeenLastCalledWith('owner', undefined);
  });
  it.each([
    ['dashboard', dashboard.GET, 'getDashboardStats'], ['finance', finance.GET, 'getFinanceSummary'], ['settings', settings.GET, 'getStoreSettings'], ['staff', staff.GET, 'getStaffList'],
  ] as const)('reports authorization and persistence failures for %s', async (path, handler, method) => {
    mocks.merchant[method].mockRejectedValueOnce(new Error('عدم دسترسی')).mockRejectedValueOnce(new Error(''));
    expect((await handler(request(path))).status).toBe(403); expect((await handler(request(path))).status).toBe(500);
  });
  it('normalizes staff mobile numbers and gives the selected store query precedence', async () => {
    const response = await staff.POST(request('staff?merchantId=query-store', 'POST', { mobile: '+989121111111', role: 'CASHIER', merchantId: 'body-store' }));
    expect(response.status).toBe(200); expect(mocks.merchant.addStaffMember).toHaveBeenCalledWith('owner', { mobile: '09121111111', role: 'CASHIER', canScanPickup: true }, 'query-store');
    expect((await staff.POST(request('staff', 'POST', { mobile: 'bad', role: 'OWNER' }))).status).toBe(400);
  });
  it('validates settings before writing and passes only supported fields', async () => {
    expect((await settings.PUT(request('settings', 'PUT', { merchantId: 'store', businessNameFa: ' فروشگاه ', commissionPercent: 0 }))).status).toBe(200);
    expect(mocks.merchant.updateStoreSettings).toHaveBeenCalledWith('owner', { businessNameFa: 'فروشگاه' }, 'store');
    expect((await settings.PUT(request('settings', 'PUT', { latitude: 200 }))).status).toBe(400);
  });
  it('revokes the exact membership within the selected store', async () => {
    expect((await staffItem.DELETE(request('staff/item?merchantId=store', 'DELETE'), context())).status).toBe(200);
    expect(mocks.merchant.removeStaffMember).toHaveBeenCalledWith('owner', 'item', 'store');
  });
  it('serializes listing prices and remaining stock without BigInt JSON failures', async () => {
    const response = await listings.GET(request('listings?merchantId=store'));
    expect(await response.json()).toMatchObject({ success: true, count: 1, data: [{ originalPriceToman: 200, discountedPriceToman: 100, discountPercent: 50, remainingQuantity: 2, imageUrl: null }] });
    expect(mocks.listing.getMerchantListings).toHaveBeenCalledWith('store');
  });
  it('publishes with server-resolved merchant/location and category, ignoring client identities', async () => {
    expect((await listings.POST(request('listings', 'POST', { ...validListing(), merchantId: 'requested', merchantLocationId: 'foreign' }))).status).toBe(200);
    expect(mocks.merchant.resolveMerchantAndAuthorize).toHaveBeenCalledWith('owner', 'requested', 'MANAGER');
    expect(mocks.listing.createListing).toHaveBeenCalledWith(expect.objectContaining({ merchantId: 'store', merchantLocationId: 'location', categoryId: 'category', type: 'SURPRISE_BAG' }), 'owner');
  });
  it('rejects invalid listing data and unknown categories without publishing', async () => {
    expect((await listings.POST(request('listings', 'POST', {}))).status).toBe(400);
    mocks.db.category.findUnique.mockResolvedValue(null); expect((await listings.POST(request('listings', 'POST', validListing()))).status).toBe(400);
    expect(mocks.listing.createListing).not.toHaveBeenCalled();
  });
  it('uses the store-local clock for explicit pickup windows', async () => {
    expect((await listings.POST(request('listings', 'POST', { ...validListing(), pickupDate: '2099-10-03', pickupStart: '18:00', pickupEnd: '19:00' }))).status).toBe(200);
    expect(mocks.listing.createListing.mock.calls[0][0].pickupStart.toISOString()).toBe('2099-10-03T14:30:00.000Z');
  });
  it('updates image and pickup instructions independently', async () => {
    mocks.image.mockResolvedValue('/photo'); mocks.pickup.mockResolvedValue({ packaging: 'CUSTOMER_CONTAINER' });
    expect((await listingItem.PATCH(request('listings/item', 'PATCH', { imageUrl: '/photo' }), context())).status).toBe(200); expect(mocks.image).toHaveBeenCalledWith('store', 'item', '/photo', 'owner');
    expect((await listingItem.PATCH(request('listings/item', 'PATCH', { pickupDetails: { packaging: 'CUSTOMER_CONTAINER' } }), context())).status).toBe(200);
    expect(mocks.pickup).toHaveBeenCalledWith('store', 'item', { packaging: 'CUSTOMER_CONTAINER' }, 'owner');
  });
  it.each([{ imageUrl: '/photo', status: 'PAUSED' }, { imageUrl: '/photo', pickupDetails: {} }, { pickupDetails: {}, totalQuantity: 5 }])('rejects ambiguous combined listing operations %o', async body => {
    expect((await listingItem.PATCH(request('listings/item', 'PATCH', body), context())).status).toBe(400); expect(mocks.image).not.toHaveBeenCalled(); expect(mocks.pickup).not.toHaveBeenCalled();
  });
  it('separates status changes, stock adjustments and archiving', async () => {
    expect((await listingItem.PATCH(request('listings/item', 'PATCH', { status: 'PAUSED' }), context())).status).toBe(200); expect(mocks.listing.toggleListingStatus).toHaveBeenCalledWith('store', 'item', 'PAUSED', 'owner');
    expect((await listingItem.PATCH(request('listings/item', 'PATCH', { deltaQuantity: 3 }), context())).status).toBe(200); expect(mocks.listing.adjustListingStock).toHaveBeenCalledWith('store', 'item', { deltaQuantity: 3 }, 'owner');
    expect((await listingItem.DELETE(request('listings/item', 'DELETE'), context())).status).toBe(200); expect(mocks.listing.toggleListingStatus).toHaveBeenLastCalledWith('store', 'item', 'EXPIRED', 'owner');
  });
});
