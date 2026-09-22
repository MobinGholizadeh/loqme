"use client";
import { useState } from 'react';
import type { PickupDetailsInput } from '@loqme/validation';
import { DialogSurface } from '@/components/ui/DialogSurface';
import { Button } from '@/components/ui/Button';
import { PickupDetailsFields, emptyPickupDetails } from './PickupDetailsFields';

export function PickupDetailsEditor({ listing, onClose, onSaved }: { listing: { id: string; pickupDetails?: PickupDetailsInput }; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(listing.pickupDetails ?? emptyPickupDetails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <DialogSurface label="ویرایش راهنمای دریافت" onClose={onClose}><form className="pickup-editor" onSubmit={async event => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch(`/api/merchant/listings/${listing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pickupDetails: value }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'ذخیره انجام نشد');
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'ارتباط برقرار نشد'); }
    finally { setSaving(false); }
  }}><PickupDetailsFields value={value} onChange={setValue}/>{error && <p role="alert">{error}</p>}<div className="flex gap-3"><Button type="submit" isLoading={saving}>ذخیره</Button><Button type="button" variant="secondary" onClick={onClose}>بستن</Button></div></form></DialogSurface>;
}
