import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUSINESS_DRAFT_KEY, clearBusinessDraft, emptyBusinessDraft, readBusinessDraft, saveBusinessDraft } from '@/lib/business/draft';
import { OperatingHoursDaySchema } from '@loqme/validation';
import { readBoundedBody } from '@/lib/business/bounded-body';

describe('onboarding recovery and nullable pickup defaults', () => {
  const values = new Map<string, string>();
  beforeEach(() => { values.clear(); vi.stubGlobal('sessionStorage', { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }); });
  afterEach(() => vi.unstubAllGlobals());
  it('restores noncredential fields and step, then clears the draft', () => {
    const draft = { ...emptyBusinessDraft(), businessNameFa: 'فروشگاه آزمایش' };
    saveBusinessDraft(draft, 2);
    expect(readBusinessDraft()).toEqual({ draft, step: 2 });
    expect(values.get(BUSINESS_DRAFT_KEY)).not.toContain('ownerName');
    clearBusinessDraft(); expect(readBusinessDraft()).toBeNull();
  });
  it('discards expired, unversioned, malformed or credential-bearing drafts', () => {
    for (const extra of [{ version: 2 }, { expiresAt: Date.now() - 1 }, { expiresAt: null }, { draft: { ...emptyBusinessDraft(), code: '12345' } }]) {
      values.set(BUSINESS_DRAFT_KEY, JSON.stringify({ version: 1, expiresAt: Date.now() + 10000, step: 2, draft: emptyBusinessDraft(), ...extra }));
      expect(readBusinessDraft()).toBeNull(); expect(values.has(BUSINESS_DRAFT_KEY)).toBe(false);
    }
  });
  it('allows closed blank hours and unset pickup windows, rejects half-configured pickup', () => {
    const day = { dayOfWeek: 6, isOpen: false, storeOpenTime: '', storeCloseTime: '', defaultPickupStart: null, defaultPickupEnd: null };
    expect(OperatingHoursDaySchema.safeParse(day).success).toBe(true);
    expect(OperatingHoursDaySchema.safeParse({ ...day, isOpen: true }).success).toBe(false);
    expect(OperatingHoursDaySchema.safeParse({ ...day, defaultPickupStart: '12:00' }).success).toBe(false);
    expect(OperatingHoursDaySchema.safeParse({ ...day, isOpen: true, storeOpenTime: '09:00', storeCloseTime: '18:00' }).success).toBe(true);
  });
  it('bounds streamed response bytes before materializing an oversized body', async () => {
    await expect(readBoundedBody(new Response('سلام').body, 8)).resolves.toBe('سلام');
    await expect(readBoundedBody(new Response('سلام').body, 4)).rejects.toThrow(RangeError);
  });
});
