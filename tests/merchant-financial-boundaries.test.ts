import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { db } = vi.hoisted(() => ({ db: {
  merchant: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() }, order: { findMany: vi.fn(), count: vi.fn() }, listing: { findMany: vi.fn(), count: vi.fn() }, financialTransaction: { findMany: vi.fn() }, complaint: { count: vi.fn() },
} }));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/domain/listing/image-storage', () => ({ listingImageStorage: {} }));
import { MerchantService } from '@/domain/merchant/merchant.service';
import { AdminService } from '@/domain/admin/admin.service';
describe('Historical financial values and payout identity', () => {
  let service: MerchantService;
  const merchant = () => ({ id: 'merchant', businessNameFa: 'فروشگاه', commissionPercent: 30, locations: [], ratingAverage: 0, ratingCount: 0 });
  const orders = () => [{ id: 'order', status: 'COMPLETED', totalAmountToman: 1000n, commissionAmountToman: 100n, merchantPayoutAmountToman: 900n, items: [{ quantity: 2 }], refunds: [] }];
  beforeEach(() => {
    vi.resetAllMocks(); service = new MerchantService(); vi.spyOn(service, 'resolveMerchantAndAuthorize').mockResolvedValue({ merchant: merchant(), role: 'OWNER' } as never);
    db.order.findMany.mockResolvedValue(orders()); db.order.count.mockResolvedValue(1); db.listing.findMany.mockResolvedValue([]); db.financialTransaction.findMany.mockResolvedValue([]);
  });
  afterEach(() => vi.restoreAllMocks());
  it('keeps dashboard payouts at the agreed order amount after commission changes', async () => {
    expect(await service.getDashboardStats('owner')).toMatchObject({ grossRevenueTodayToman: 1000, netPayoutTodayToman: 900, soldTodayCount: 2 });
  });
  it('reports actual platform commission rather than assuming every order has a 10% fee', async () => {
    db.order.findMany.mockResolvedValue([{ totalAmountToman: 1000n, commissionAmountToman: 75n }, { totalAmountToman: 1000n, commissionAmountToman: 0n }]);
    db.merchant.count.mockResolvedValue(0); db.listing.count.mockResolvedValue(0); db.complaint.count.mockResolvedValue(0);
    expect(await new AdminService().getDashboardKPIs()).toMatchObject({ gmv24hToman: 2000, commission24hToman: 75, totalOrders24hCount: 2 });
  });
  it('keeps finance totals at recorded amounts and never fabricates verified bank details', async () => {
    const summary = await service.getFinanceSummary('owner');
    expect(summary).toMatchObject({ commissionPercent: 30, grossSalesToman: 1000, platformCommissionToman: 100, netPayableBalanceToman: 900, shabaNumber: null, isBankVerified: false });
  });
  it('preserves zero current commission and the commission agreed on earlier orders', async () => {
    vi.mocked(service.resolveMerchantAndAuthorize).mockResolvedValue({ merchant: { ...merchant(), commissionPercent: 0 }, role: 'OWNER' } as never);
    expect(await service.getFinanceSummary('owner')).toMatchObject({ commissionPercent: 0, platformCommissionToman: 100 });
  });
  it('uses historical order commissions in admin settlements and leaves missing bank identity empty', async () => {
    db.merchant.findMany.mockResolvedValue([{ ...merchant(), orders: orders() }, { ...merchant(), id: 'free', commissionPercent: 0, orders: [{ ...orders()[0], commissionAmountToman: 0n, merchantPayoutAmountToman: 1000n }] }]);
    const result = await new AdminService().getSettlementReport();
    expect(result).toMatchObject({ totalGmvToman: 2000, totalPlatformCommissionToman: 100, totalNetPayableToman: 1900 });
    expect(result.merchants[0]).toMatchObject({ shabaNumber: null, commissionCutToman: 100 }); expect(result.merchants[1].commissionPercent).toBe(0);
  });
  it('shows one payment/refund row per customer transfer using historical commission', async () => {
    db.financialTransaction.findMany.mockResolvedValue(['CUSTOMER_PAYMENT', 'CUSTOMER_REFUND'].map((type, i) => ({ id: `tx-${i}`, type, orderId: 'order', amountToman: 1000n, createdAt: new Date(), order: { orderNumber: 'LQ-1', commissionAmountToman: 100n } })));
    const result = await service.getFinanceSummary('owner');
    expect(result.transactions).toMatchObject([
      { grossAmountToman: 1000, commissionAmountToman: 100, netAmountToman: 900 },
      { grossAmountToman: -1000, commissionAmountToman: -100, netAmountToman: -900 },
    ]);
    expect(db.financialTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [
      { type: 'CUSTOMER_PAYMENT' }, { type: 'CUSTOMER_REFUND', debitAccount: 'PLATFORM_CLEARING', creditAccount: 'CUSTOMER_PAYMENT' },
    ] }) }));
  });
});
