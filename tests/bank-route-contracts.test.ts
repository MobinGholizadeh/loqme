import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: { extractSessionToken: vi.fn(), verifySessionToken: vi.fn() },
  merchantBank: {
    listBankAccounts: vi.fn(),
    addBankAccount: vi.fn(),
    updateBankAccount: vi.fn(),
    deleteBankAccount: vi.fn(),
    setDefaultBankAccount: vi.fn(),
    getWalletSummary: vi.fn(),
    listPayoutRequests: vi.fn(),
    requestPayout: vi.fn(),
  },
  adminBank: {
    listBankAccountsForAdmin: vi.fn(),
    reviewBankAccount: vi.fn(),
    listPayoutRequestsForAdmin: vi.fn(),
    reviewPayoutRequest: vi.fn(),
  },
  adminAuth: {
    assertActiveAdmin: vi.fn(),
    requireAdminSession: vi.fn(),
  },
}));

vi.mock('@/lib/auth/session', () => mocks.auth);
vi.mock('@/lib/auth/admin-auth', () => ({
  requireAdminSession: mocks.adminAuth.requireAdminSession,
}));
vi.mock('@/domain/merchant/merchant-bank.service', () => ({
  merchantBankService: mocks.merchantBank,
}));
vi.mock('@/domain/admin/admin-bank.service', () => ({
  adminBankService: mocks.adminBank,
}));
vi.mock('@/domain/admin/merchant-account.service', () => ({
  assertActiveAdmin: mocks.adminAuth.assertActiveAdmin,
}));

import * as merchantBankAccounts from '@/app/api/merchant/bank-accounts/route';
import * as merchantBankAccountItem from '@/app/api/merchant/bank-accounts/[id]/route';
import * as merchantBankAccountDefault from '@/app/api/merchant/bank-accounts/[id]/default/route';
import * as merchantPayouts from '@/app/api/merchant/payouts/route';
import * as adminBankAccounts from '@/app/api/admin/finance/bank-accounts/route';
import * as adminBankAccountReview from '@/app/api/admin/finance/bank-accounts/[id]/review/route';
import * as adminPayouts from '@/app/api/admin/finance/payouts/route';
import * as adminPayoutReview from '@/app/api/admin/finance/payouts/[id]/review/route';

const makeReq = (url: string, method = 'GET', body?: unknown) =>
  new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  });

const makeParam = (id = 'item-1') => ({ params: Promise.resolve({ id }) });

describe('Merchant & Admin Bank API Route Contracts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default merchant auth
    mocks.auth.extractSessionToken.mockReturnValue('mock-token');
    mocks.auth.verifySessionToken.mockResolvedValue({ userId: 'user-merchant', role: 'MERCHANT_OWNER' });
    mocks.adminAuth.assertActiveAdmin.mockResolvedValue({ id: 'user-admin', role: 'ADMIN', status: 'ACTIVE' });
    mocks.adminAuth.requireAdminSession.mockResolvedValue({
      session: { userId: 'user-admin', role: 'ADMIN' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Gates', () => {
    it('rejects unauthenticated requests to merchant bank routes', async () => {
      mocks.auth.extractSessionToken.mockReturnValue(null);

      const res1 = await merchantBankAccounts.GET(makeReq('http://localhost/api/merchant/bank-accounts'));
      expect(res1.status).toBe(401);

      const res2 = await merchantPayouts.GET(makeReq('http://localhost/api/merchant/payouts'));
      expect(res2.status).toBe(401);

      const res3 = await merchantBankAccountDefault.POST(
        makeReq('http://localhost/api/merchant/bank-accounts/item-1/default', 'POST'),
        makeParam('item-1')
      );
      expect(res3.status).toBe(401);
    });

    it('rejects non-admin requests to admin bank review routes', async () => {
      mocks.adminAuth.requireAdminSession.mockResolvedValue({
        errorResponse: { status: 403, json: async () => ({ success: false }) },
      });

      const res1 = await adminBankAccounts.GET(makeReq('http://localhost/api/admin/finance/bank-accounts'));
      expect(res1.status).toBe(403);

      const res2 = await adminPayouts.GET(makeReq('http://localhost/api/admin/finance/payouts'));
      expect(res2.status).toBe(403);
    });
  });

  describe('Merchant Bank Accounts API', () => {
    it('GET /api/merchant/bank-accounts returns list of accounts for owner', async () => {
      mocks.merchantBank.listBankAccounts.mockResolvedValue([
        { id: 'acc-1', bankName: 'ملت', isDefault: true },
      ]);

      const res = await merchantBankAccounts.GET(
        makeReq('http://localhost/api/merchant/bank-accounts?merchantId=m-1')
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(mocks.merchantBank.listBankAccounts).toHaveBeenCalledWith('user-merchant', 'm-1');
    });

    it('POST /api/merchant/bank-accounts creates account successfully', async () => {
      mocks.merchantBank.addBankAccount.mockResolvedValue({
        id: 'acc-new',
        bankName: 'سامان',
        status: 'PENDING',
      });

      const res = await merchantBankAccounts.POST(
        makeReq('http://localhost/api/merchant/bank-accounts', 'POST', {
          shabaNumber: 'IR820120000000001234567890',
          bankName: 'بانک سامان',
          accountHolder: 'علی حسینی',
        })
      );
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('acc-new');
    });

    it('PUT /api/merchant/bank-accounts/[id] updates account', async () => {
      mocks.merchantBank.updateBankAccount.mockResolvedValue({
        id: 'acc-1',
        bankName: 'سامان جدید',
        status: 'PENDING',
      });

      const res = await merchantBankAccountItem.PUT(
        makeReq('http://localhost/api/merchant/bank-accounts/acc-1', 'PUT', {
          accountHolder: 'نام جدید',
        }),
        makeParam('acc-1')
      );
      expect(res.status).toBe(200);
      expect(mocks.merchantBank.updateBankAccount).toHaveBeenCalledWith(
        'user-merchant',
        undefined,
        'acc-1',
        { accountHolder: 'نام جدید' }
      );
    });

    it('DELETE /api/merchant/bank-accounts/[id] deletes account', async () => {
      mocks.merchantBank.deleteBankAccount.mockResolvedValue({
        success: true,
        message: 'حساب حذف شد',
      });

      const res = await merchantBankAccountItem.DELETE(
        makeReq('http://localhost/api/merchant/bank-accounts/acc-1', 'DELETE'),
        makeParam('acc-1')
      );
      expect(res.status).toBe(200);
      expect(mocks.merchantBank.deleteBankAccount).toHaveBeenCalledWith(
        'user-merchant',
        undefined,
        'acc-1'
      );
    });

    it('POST /api/merchant/bank-accounts/[id]/default sets default account', async () => {
      mocks.merchantBank.setDefaultBankAccount.mockResolvedValue({
        id: 'acc-1',
        isDefault: true,
      });

      const res = await merchantBankAccountDefault.POST(
        makeReq('http://localhost/api/merchant/bank-accounts/acc-1/default', 'POST'),
        makeParam('acc-1')
      );
      expect(res.status).toBe(200);
      expect(mocks.merchantBank.setDefaultBankAccount).toHaveBeenCalledWith(
        'user-merchant',
        undefined,
        'acc-1'
      );
    });
  });

  describe('Merchant Payouts API', () => {
    it('GET /api/merchant/payouts returns wallet summary and payout history', async () => {
      mocks.merchantBank.getWalletSummary.mockResolvedValue({
        availableBalanceToman: 500000,
        netEarningsToman: 1000000,
      });
      mocks.merchantBank.listPayoutRequests.mockResolvedValue([]);

      const res = await merchantPayouts.GET(makeReq('http://localhost/api/merchant/payouts'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.wallet.availableBalanceToman).toBe(500000);
    });

    it('POST /api/merchant/payouts requests payout successfully', async () => {
      mocks.merchantBank.requestPayout.mockResolvedValue({
        id: 'payout-1',
        amountToman: 200000,
        status: 'PENDING',
      });

      const res = await merchantPayouts.POST(
        makeReq('http://localhost/api/merchant/payouts', 'POST', {
          bankAccountId: '00000000-0000-0000-0000-000000000001',
          amountToman: 200000,
        })
      );
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('payout-1');
    });
  });

  describe('Admin Bank & Payout Review API', () => {
    beforeEach(() => {
      mocks.auth.verifySessionToken.mockResolvedValue({ userId: 'user-admin', role: 'ADMIN' });
    });

    it('GET /api/admin/finance/bank-accounts returns list for admin', async () => {
      mocks.adminBank.listBankAccountsForAdmin.mockResolvedValue([]);

      const res = await adminBankAccounts.GET(
        makeReq('http://localhost/api/admin/finance/bank-accounts?status=PENDING')
      );
      expect(res.status).toBe(200);
      expect(mocks.adminBank.listBankAccountsForAdmin).toHaveBeenCalledWith('user-admin', 'PENDING');
    });

    it('POST /api/admin/finance/bank-accounts/[id]/review approves bank account', async () => {
      mocks.adminBank.reviewBankAccount.mockResolvedValue({
        id: 'acc-1',
        status: 'APPROVED',
      });

      const res = await adminBankAccountReview.POST(
        makeReq('http://localhost/api/admin/finance/bank-accounts/acc-1/review', 'POST', {
          action: 'APPROVE',
        }),
        makeParam('acc-1')
      );
      expect(res.status).toBe(200);
      expect(mocks.adminBank.reviewBankAccount).toHaveBeenCalledWith('user-admin', 'acc-1', {
        action: 'APPROVE',
      });
    });

    it('GET /api/admin/finance/payouts returns payouts for admin', async () => {
      mocks.adminBank.listPayoutRequestsForAdmin.mockResolvedValue([]);

      const res = await adminPayouts.GET(makeReq('http://localhost/api/admin/finance/payouts'));
      expect(res.status).toBe(200);
      expect(mocks.adminBank.listPayoutRequestsForAdmin).toHaveBeenCalledWith('user-admin', undefined);
    });

    it('POST /api/admin/finance/payouts/[id]/review completes payout request with tracking reference', async () => {
      mocks.adminBank.reviewPayoutRequest.mockResolvedValue({
        id: 'payout-1',
        status: 'COMPLETED',
        trackingReference: 'PAYA-1403-999',
      });

      const res = await adminPayoutReview.POST(
        makeReq('http://localhost/api/admin/finance/payouts/payout-1/review', 'POST', {
          action: 'COMPLETE',
          trackingReference: 'PAYA-1403-999',
        }),
        makeParam('payout-1')
      );
      expect(res.status).toBe(200);
      expect(mocks.adminBank.reviewPayoutRequest).toHaveBeenCalledWith('user-admin', 'payout-1', {
        action: 'COMPLETE',
        trackingReference: 'PAYA-1403-999',
      });
    });
  });
});
