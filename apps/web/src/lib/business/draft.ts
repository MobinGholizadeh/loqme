import { z } from 'zod';
import { BusinessDetailsSchema } from '@loqme/validation';
import type { MerchantApplicationInput, BusinessType } from '@loqme/types';
export const BUSINESS_DRAFT_KEY = 'loqme-business-draft-v1';
export type BusinessDraft = Omit<MerchantApplicationInput, 'ownerName' | 'businessType'> & { businessType: BusinessType | ''; locationConfirmed: boolean };
export const emptyBusinessDraft = (): BusinessDraft => ({
  businessNameFa: '', businessType: '', cityId: '', addressFa: '', latitude: 37.5527, longitude: 45.0761,
  phone: '', licenseNumber: '', mapirPlaceId: null, locationConfirmed: false,
  hours: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: false, storeOpenTime: '', storeCloseTime: '' })),
});
const DraftSchema = BusinessDetailsSchema.extend({
  businessNameFa: z.string().max(100), addressFa: z.string().max(255), cityId: z.string().max(100),
  businessType: z.union([BusinessDetailsSchema.shape.businessType, z.literal('')]), locationConfirmed: z.boolean(),
  hours: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), isOpen: z.boolean(), storeOpenTime: z.string().max(5), storeCloseTime: z.string().max(5) }).strict()).length(7),
}).strict();
export function readBusinessDraft(): { draft: BusinessDraft; step: number } | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(BUSINESS_DRAFT_KEY) || 'null');
    if (!raw || raw.version !== 1 || raw.expiresAt <= Date.now()) { clearBusinessDraft(); return null; }
    const draft = DraftSchema.parse(raw.draft);
    return { draft, step: Number.isInteger(raw.step) ? Math.max(0, Math.min(4, raw.step)) : 0 };
  } catch { clearBusinessDraft(); return null; }
}
export function saveBusinessDraft(draft: BusinessDraft, step: number) {
  try { sessionStorage.setItem(BUSINESS_DRAFT_KEY, JSON.stringify({ version: 1, expiresAt: Date.now() + 24 * 60 * 60 * 1000, draft: DraftSchema.parse(draft), step })); } catch { /* Storage may be disabled; in-memory form remains usable. */ }
}
export function clearBusinessDraft() { try { sessionStorage.removeItem(BUSINESS_DRAFT_KEY); } catch { /* Optional browser persistence. */ } }
