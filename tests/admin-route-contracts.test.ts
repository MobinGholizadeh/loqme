// Unit-test route contracts independently; real JWT-to-RLS binding is covered in rls.integration.test.ts.
vi.mock('@/lib/db/request', () => ({ withDatabaseRequest: (handler: unknown) => handler }));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { admin, auth, liveUser } = vi.hoisted(() => ({
  liveUser: vi.fn(),
  admin: { getDashboardKPIs: vi.fn(), listCustomers: vi.fn(), listMerchants: vi.fn(), listGlobalListings: vi.fn(), listCategories: vi.fn(), createCategory: vi.fn(), getSystemSettings: vi.fn(), updateSystemSettings: vi.fn() },
  auth: { extractSessionToken: vi.fn(), verifySessionToken: vi.fn() },
}));
vi.mock('@/domain/admin/admin.service', () => ({ adminService: admin }));
vi.mock('@/lib/auth/session', () => auth);
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: liveUser } } }));
import * as dashboard from '@/app/api/admin/dashboard/route';
import * as customers from '@/app/api/admin/customers/route';
import * as merchants from '@/app/api/admin/merchants/route';
import * as listings from '@/app/api/admin/listings/route';
import * as categories from '@/app/api/admin/categories/route';
import * as settings from '@/app/api/admin/settings/route';

const routes = [
  ['dashboard', dashboard.GET, 'getDashboardKPIs'], ['customers', customers.GET, 'listCustomers'],
  ['merchants', merchants.GET, 'listMerchants'], ['listings', listings.GET, 'listGlobalListings'],
  ['categories', categories.GET, 'listCategories'], ['settings', settings.GET, 'getSystemSettings'],
] as const;
describe('Admin route authentication and response contracts', () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {});
    liveUser.mockResolvedValue({ role: 'ADMIN', isActive: true });
    auth.extractSessionToken.mockReturnValue('token'); auth.verifySessionToken.mockResolvedValue({ userId: 'admin', role: 'ADMIN' });
    for (const fn of Object.values(admin)) fn.mockReturnValue([]);
  });
  afterEach(() => vi.restoreAllMocks());
  describe.each(routes)('%s', (path, handler, service) => {
    const request = (query = '') => new NextRequest(`http://localhost/api/admin/${path}${query}`);
    it.each(['CUSTOMER', 'MERCHANT_OWNER', 'MERCHANT_STAFF'])('rejects %s before any service call', async role => {
      auth.verifySessionToken.mockResolvedValue({ userId: 'user', role });
      expect((await handler(request())).status).toBe(403); expect(admin[service]).not.toHaveBeenCalled();
    });
    it('rejects missing and invalid sessions', async () => {
      auth.extractSessionToken.mockReturnValueOnce(null);
      expect((await handler(request())).status).toBe(401);
      auth.verifySessionToken.mockResolvedValue(null); expect((await handler(request())).status).toBe(401);
      expect(admin[service]).not.toHaveBeenCalled();
    });
    it('returns the service payload and honors query filters', async () => {
      admin[service].mockReturnValue([{ id: 'one' }]);
      const response = await handler(request('?search=term&status=PUBLISHED&categoryId=food'));
      expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ success: true, data: [{ id: 'one' }] });
      if (service === 'listGlobalListings') expect(admin[service]).toHaveBeenCalledWith({ search: 'term', status: 'PUBLISHED', categoryId: 'food' });
      if (service === 'listMerchants') expect(admin[service]).toHaveBeenCalledWith({ search: 'term', status: 'PUBLISHED' });
      if (service === 'listCustomers') expect(admin[service]).toHaveBeenCalledWith({ search: 'term' });
      expect((await handler(request())).status).toBe(200);
    });
    it.each(['service failed', ''])('returns an error response for service failure (%s)', async message => {
      admin[service].mockImplementation(() => { throw new Error(message); });
      const response = await handler(request()); expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({ success: false, message: expect.any(String) });
    });
  });
  it.each([['categories', categories.POST], ['settings', settings.PUT]] as const)('protects %s writes and rejects malformed JSON', async (path, handler) => {
    const request = () => new NextRequest(`http://localhost/api/admin/${path}`, { method: path === 'settings' ? 'PUT' : 'POST', body: 'not-json' });
    auth.extractSessionToken.mockReturnValueOnce(null); expect((await handler(request())).status).toBe(401);
    expect((await handler(request())).status).toBe(400);
    expect(admin.createCategory).not.toHaveBeenCalled(); expect(admin.updateSystemSettings).not.toHaveBeenCalled();
  });
});
