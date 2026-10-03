import { describe, expect, it } from 'vitest';
import { resolvePickupWindow } from '@/domain/listing/pickup-window';
const now = new Date('2026-10-03T12:00:00Z');
describe('Merchant pickup time validation', () => {
  it('interprets clock-only pickup inputs in Tehran rather than the host timezone', () => {
    const result = resolvePickupWindow({ pickupStart: '18:00', pickupEnd: '19:30' }, now);
    expect(result.pickupStart.toISOString()).toBe('2026-10-03T14:30:00.000Z'); expect(result.pickupEnd.toISOString()).toBe('2026-10-03T16:00:00.000Z');
  });
  it('uses the Tehran calendar day across UTC midnight boundaries', () => {
    const result = resolvePickupWindow({ pickupStart: '1:00', pickupEnd: '02:00' }, new Date('2026-10-03T21:00:00Z'));
    expect(result.pickupStart.toISOString()).toBe('2026-10-03T21:30:00.000Z');
  });
  it('preserves explicit timezone-aware instants and accepts ISO pickup dates', () => {
    const result = resolvePickupWindow({ pickupDate: '2026-10-04T00:00:00Z', pickupStart: '2026-10-04T18:00:00+03:30', pickupEnd: '2026-10-04T16:00:00Z' }, now);
    expect(result.pickupStart.toISOString()).toBe('2026-10-04T14:30:00.000Z');
  });
  it('defaults to one through three hours from now', () => {
    const result = resolvePickupWindow({}, now); expect(result.pickupStart.getTime() - now.getTime()).toBe(3600000); expect(result.pickupEnd.getTime() - now.getTime()).toBe(10800000);
  });
  it.each([
    { pickupDate: 'invalid' }, { pickupDate: '2026-02-30' },
    { pickupStart: '99:00', pickupEnd: '23:00' }, { pickupStart: '18:99', pickupEnd: '19:00' },
    { pickupStart: '18:00' }, { pickupEnd: '19:00' },
    { pickupStart: '19:00', pickupEnd: '18:00' }, { pickupStart: '18:00', pickupEnd: '18:00' },
    { pickupDate: '2026-10-02', pickupStart: '18:00', pickupEnd: '19:00' },
    { pickupStart: '2026-10-04T18:00:00', pickupEnd: '2026-10-04T19:00:00' },
    { pickupStart: 'invalidTZ', pickupEnd: '2026-10-04T19:00:00Z' },
  ])('rejects invalid, incomplete or expired window %o', input => {
    expect(() => resolvePickupWindow(input, now)).toThrow();
  });
});
