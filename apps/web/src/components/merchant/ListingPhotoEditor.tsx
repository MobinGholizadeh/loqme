'use client';
import { useState } from 'react';
import { DialogSurface } from '@/components/ui/DialogSurface';
import { Button } from '@/components/ui/Button';
import { ListingImagePicker } from './ListingImagePicker';

export function ListingPhotoEditor({ listing, onClose, onSaved }: { listing: { id: string; imageUrl?: string | null; categorySlug?: string }; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(listing.imageUrl || '');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <DialogSurface label="تصویر بسته" onClose={onClose}><form className="pickup-editor" onSubmit={async event => {
    event.preventDefault(); if (!value) { setError('تصویر بسته را انتخاب کنید'); return; }
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/merchant/listings/${listing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: value }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'ذخیره انجام نشد');
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'ارتباط برقرار نشد'); }
    finally { setSaving(false); }
  }}><ListingImagePicker value={value} categorySlug={listing.categorySlug} onChange={setValue} onBusyChange={setBusy}/>{error && <p role="alert">{error}</p>}<div className="flex gap-3"><Button type="submit" disabled={busy} isLoading={saving}>ذخیره تصویر</Button><Button type="button" variant="secondary" onClick={onClose}>بستن</Button></div></form></DialogSurface>;
}
