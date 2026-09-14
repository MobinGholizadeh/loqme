"use client";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { ListingImage } from "@/components/ui/ListingImage";
import { LISTING_IMAGE_CATALOG } from "@/lib/listing-image-catalog";

export function ListingImagePicker({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("عکس JPG، PNG یا WebP با حجم حداکثر ۵ مگابایت انتخاب کنید");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    try {
      const response = await fetch("/api/merchant/listings/image", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      onChange(result.imageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "بارگذاری تصویر انجام نشد");
    } finally {
      setBusy(false);
      onBusyChange(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <fieldset className="space-y-3" disabled={busy}>
      <legend className="text-sm font-bold mb-2">تصویر بسته</legend>
      <input
        ref={input}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="عکس از گالری"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <button
        type="button"
        className="action-link"
        onClick={() => input.current?.click()}
      >
        <Upload size={18} />
        {busy ? "در حال بارگذاری..." : "انتخاب از گالری"}
      </button>
      <p className="text-xs text-loqme-neutral-600">عکس‌های تزئینی لقمه</p>
      <div className="grid grid-cols-3 gap-2">
        {LISTING_IMAGE_CATALOG.map((image) => (
          <button
            key={image.url}
            aria-label={image.label}
            type="button"
            aria-pressed={value === image.url}
            onClick={() => {
              onChange(image.url);
              setError("");
            }}
            className={`overflow-hidden rounded-lg border-2 text-xs ${value === image.url ? "border-teal-700" : "border-transparent"}`}
          >
            <span className="relative block aspect-[4/3]">
              <ListingImage src={image.url} alt={image.label} />
            </span>
            <span className="block p-2">{image.label}</span>
          </button>
        ))}
      </div>
      {value && (
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-28 overflow-hidden rounded-lg">
            <ListingImage src={value} alt="تصویر انتخاب‌شده" />
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="حذف تصویر"
            onClick={() => onChange("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
