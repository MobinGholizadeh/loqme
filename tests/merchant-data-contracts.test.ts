// Unit-test route contracts independently; real JWT-to-RLS binding is covered in rls.integration.test.ts.
vi.mock('@/lib/db/request', () => ({ withDatabaseRequest: (handler: unknown) => handler }));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ session: vi.fn(), context: vi.fn(), report: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ extractSessionToken: () => 'token', verifySessionToken: mocks.session }));
vi.mock('@/domain/merchant/merchant-report.service', () => ({ getMerchantDataReport: mocks.report }));
vi.mock('@/domain/merchant/merchant-access.service', () => ({ listMerchantContexts: mocks.context }));
import { GET } from '@/app/api/merchant/reports/route';
describe('Merchant report HTTP scope boundary', () => {
  const id = 'c3132103-f199-403b-9cf8-bad7c5b72ab2';
  beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({ userId: 'owner' }); });
  it.each(['', `?merchantId=${id}&days=365`, `?merchantId=${id}&customerId=other`, '?merchantId=not-an-id'])('rejects unsupported query %s', async query => {
    const response = await GET(new NextRequest(`http://localhost/api/merchant/reports${query}`));
    expect(response.status).toBe(400); expect(mocks.report).not.toHaveBeenCalled(); expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('requires authentication and does not expose service errors', async () => {
    mocks.session.mockResolvedValueOnce(null);
    expect((await GET(new NextRequest(`http://localhost/api/merchant/reports?merchantId=${id}`))).status).toBe(401);
    mocks.report.mockRejectedValueOnce(new Error('عدم دسترسی: foreign store secret')).mockRejectedValueOnce(new Error('private SQL failure'));
    const denied = await GET(new NextRequest(`http://localhost/api/merchant/reports?merchantId=${id}`));
    expect(denied.status).toBe(403); expect(await denied.text()).not.toContain('secret');
    const failed = await GET(new NextRequest(`http://localhost/api/merchant/reports?merchantId=${id}`));
    expect(failed.status).toBe(500); expect(await failed.text()).not.toContain('SQL');
  });
  it('uses authenticated identity and validated explicit store/location', async () => {
    mocks.report.mockResolvedValue({ collectionsToman: '9007199254740993' });
    const response = await GET(new NextRequest(`http://localhost/api/merchant/reports?merchantId=${id}&locationId=${id}&days=30`));
    expect(mocks.report).toHaveBeenCalledWith('owner', id, id, 30);
    expect(await response.json()).toMatchObject({ data: { collectionsToman: '9007199254740993' } });
  });
});
