"use client";
import type { PickupDetailsInput } from '@loqme/validation';
import { Select } from '@/components/ui/Select';

export const emptyPickupDetails: PickupDetailsInput = { containerProvided: null, carrierBagProvided: null, instructionsFa: '' };
export function PickupDetailsFields({ value, onChange }: { value: PickupDetailsInput; onChange: (value: PickupDetailsInput) => void }) {
  return <fieldset className="pickup-details-fields">
    <legend>بسته‌بندی و راهنمای دریافت</legend>
    <div className="grid grid-cols-2 gap-3">
      {([{ key: 'containerProvided', label: 'ظرف غذا' }, { key: 'carrierBagProvided', label: 'کیسه حمل' }] as const).map(({ key, label }) =>
        <Select key={key} label={label} value={value[key] == null ? '' : String(value[key])} onChange={event => onChange({ ...value, [key]: event.target.value === '' ? null : event.target.value === 'true' })}>
          <option value="">مشخص نشده</option><option value="true">ارائه می‌شود</option><option value="false">ارائه نمی‌شود</option>
        </Select>)}
    </div>
    <label>راهنمای دریافت از فروشگاه<textarea className="pickup-instructions-input" rows={3} maxLength={500} value={value.instructionsFa} onChange={event => onChange({ ...value, instructionsFa: event.target.value })} placeholder="مثلاً به صندوق مراجعه کنید."/></label>
  </fieldset>;
}
