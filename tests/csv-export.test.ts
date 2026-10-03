import { afterEach, describe, expect, it, vi } from 'vitest';
import { csvCell, csvRow } from '@/lib/utils/csv';
import { analyticsService } from '@/domain/analytics/analytics.service';
afterEach(() => vi.restoreAllMocks());
describe('Spreadsheet exports preserve values and neutralize formulas', () => {
  it.each([
    ['فروشگاه', 'فروشگاه'], ['a,b', '"a,b"'], ['a"b', '"a""b"'],
    ['a\nb', '"a\nb"'], ['a\rb', '"a\rb"'], [null, ''], [undefined, ''],
    [0, '0'], [-120, '-120'], ['=1+1', "'=1+1"], ['+1', "'+1"],
    ['-1', "'-1"], ['@SUM(A1)', "'@SUM(A1)"], [' \t=1', "' \t=1"],
  ])('serializes %o without changing CSV structure', (value, expected) => {
    expect(csvCell(value)).toBe(expected);
  });
  it('retains empty and numeric columns', () => {
    expect(csvRow(['محله, اول', null, 0, -10, 'IR123'])).toBe('"محله, اول",,0,-10,IR123');
  });
  it('escapes database-provided neighborhood names in the actual analytics export', async () => {
    vi.spyOn(analyticsService, 'getMarketplaceAnalytics').mockResolvedValue({
      timeframe: '30D', startDateIso: '2026-09-01', endDateIso: '2026-10-01', kpis: {},
      dailyTrends: [{ dateFa: '۱۴۰۵/۰۷/۰۱', dateIso: '2026-09-23', ordersCount: 1, soldBags: 2, gmvToman: 100, commissionToman: 10 }],
      neighborhoodDensity: [{ neighborhoodNameFa: '=HYPERLINK("url")', cityNameFa: 'شهر, اول', activeMerchantsCount: 1, activeListingsCount: 2, totalOrdersCount: 3, totalGmvToman: 100, unmetDemandScore: 4 }],
    } as any);
    const csv = await analyticsService.generateAnalyticsCsv({ timeframe: '30D' });
    expect(csv).toContain('"\'=HYPERLINK(""url"")","شهر, اول",1,2,3,100,4');
    expect(csv).toContain('۱۴۰۵/۰۷/۰۱,2026-09-23,1,2,100,10');
  });
});
