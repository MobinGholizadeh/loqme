import { describe, it, expect } from 'vitest';
import { buildMerchantInsights, merchantReportWindow } from '@/domain/merchant/merchant-report.service';
import type { MerchantDataReportDto } from '@loqme/types';
const report = (changes: Partial<MerchantDataReportDto> = {}): MerchantDataReportDto => ({
  version: '1', merchantId: 'merchant', locationId: null, source: 'LOQME_MARKETPLACE', timezone: 'Asia/Tehran', startIso: '2026-10-01T20:30:00Z', endExclusiveIso: '2026-10-08T20:30:00Z', computedAtIso: '2026-10-09T10:00:00Z', historyCoverageStartIso: null,
  collectionsToman: '0', refundsToman: '0', netCollectionsToman: '0', bookedSalesToman: '0', bookedCommissionToman: '0', bookedMerchantPayableToman: '0', paidOrderCount: 0, previousPaidOrderCount: 0, pickupCount: 0,
  quality: { unknownPaymentTimes: 0, unknownRefundTimes: 0, unknownLocations: 0, openReconciliations: 0, baselineOnly: true }, insights: [], ...changes,
});
describe('Deterministic merchant insight evaluation', () => {
  it('uses half-open Tehran calendar windows at local midnight', () => {
    expect(merchantReportWindow(new Date('2026-10-13T20:29:59Z')).end.toISOString()).toBe('2026-10-12T20:30:00.000Z');
    expect(merchantReportWindow(new Date('2026-10-13T20:30:00Z')).end.toISOString()).toBe('2026-10-13T20:30:00.000Z');
  });
  it.each([0,1,4])('abstains from recommendations when only %s orders exist', count => {
    const result = buildMerchantInsights(report({ paidOrderCount: count }));
    expect(result.map(i => i.code)).toEqual(['LOW_SAMPLE']);
  });
  it.each([5,7,10])('traces every comparison for %s orders to deterministic facts', count => {
    const result = buildMerchantInsights(report({ paidOrderCount: count, previousPaidOrderCount: 7 }));
    expect(result.map(i => i.code)).toEqual(['OBSERVED_ACTIVITY','ORDER_COMPARISON']);
    expect(result[1].evidence).toEqual(['paidOrderCount','previousPaidOrderCount']);
  });
  it('surfaces missing times and reconciliation without inventing profitability or waste', () => {
    const result = buildMerchantInsights(report({ refundsToman: '9007199254740993', quality: { ...report().quality, unknownPaymentTimes: 1, openReconciliations: 1 } }));
    expect(result.map(i => i.code)).toEqual(['RECONCILIATION','INCOMPLETE_HISTORY','LOW_SAMPLE','REFUNDS']);
    expect(JSON.stringify(result)).not.toContain('9007199254740993'); // No free-form restatement of financial amounts.
  });
});
