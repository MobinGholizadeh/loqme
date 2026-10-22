"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { ListingImage } from "@/components/ui/ListingImage";
import {
  getIllustrativeImagesForCategory,
  LISTING_IMAGE_CATALOG,
} from "@/lib/listing-image-catalog";

const CATEGORY_TABS: Array<{ slug: string; label: string }> = [
  { slug: "bakery", label: "نان و شیرینی" },
  { slug: "cafe", label: "کافه و نوشیدنی" },
  { slug: "restaurant", label: "غذا و رستوران" },
  { slug: "supermarket", label: "سوپرمارکت" },
  { slug: "produce", label: "میوه و تره‌بار" },
  { slug: "deli", label: "پروتئین و دلی" },
];

export function ListingImagePicker({
  value,
  onChange,
  onBusyChange,
  cover = false,
  categorySlug,
}: {
  cover?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
  categorySlug?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(
    categorySlug || "bakery",
  );

  useEffect(() => {
    if (categorySlug) {
      setActiveCategory(categorySlug);
    }
  }, [categorySlug]);

  // If a mock image is already selected, synchronize tab to that image's category
  useEffect(() => {
    if (value) {
      const match = LISTING_IMAGE_CATALOG.find((img) => img.url === value);
      if (match) {
        setActiveCategory((current) =>
          current === match.categorySlug ? current : match.categorySlug,
        );
      }
    }
  }, [value]);

  const categoryImages = getIllustrativeImagesForCategory(activeCategory);

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
    <fieldset className="min-w-0 w-full space-y-3" disabled={busy}>
      <legend className="text-sm font-bold mb-2">
        {cover ? "عکس جلد فروشگاه (الزامی)" : "تصویر بسته (حداقل یک تصویر الزامی است)"}
      </legend>
      <p className="text-xs text-loqme-neutral-600">
        {cover
          ? "یک عکس افقی و روشن از فروشگاه خود انتخاب کنید؛ پیشنهاد ما ۱۸۰۰ × ۶۰۰ پیکسل است"
          : "افزودن حداقل یک تصویر برای ثبت بسته الزامی است؛ عکس بسته را بارگذاری کنید یا یک تصویر تزئینی متناسب انتخاب کنید"}
      </p>
      <input
        ref={input}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="عکس از گالری"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <RippleButton
        type="button"
        className="action-link"
        onClick={() => input.current?.click()}
      >
        <Upload size={18} />
        {busy ? "در حال بارگذاری…" : "انتخاب از گالری"}
      </RippleButton>
      {!cover && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-loqme-neutral-700">
              عکس‌های تزئینی لقمه به تفکیک دسته‌بندی
            </p>
            <span className="text-[11px] text-loqme-neutral-500">
              ۳ تصویر در هر دسته
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
            role="tablist"
            aria-label="دسته‌بندی عکس‌های تزئینی"
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.slug;
              return (
                <button
                  key={tab.slug}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCategory(tab.slug)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-teal-700 text-white shadow-sm"
                      : "bg-loqme-neutral-100 text-loqme-neutral-700 hover:bg-loqme-neutral-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {categoryImages.map((image) => (
              <RippleButton
                key={image.url}
                aria-label={image.label}
                type="button"
                aria-pressed={value === image.url}
                onClick={() => {
                  onChange(image.url);
                  setError("");
                }}
                className={`overflow-hidden rounded-lg border-2 text-xs transition-all ${
                  value === image.url
                    ? "border-teal-700 ring-2 ring-teal-700/20"
                    : "border-loqme-neutral-200 hover:border-loqme-neutral-300"
                }`}
              >
                <span className="relative block aspect-[4/3] bg-loqme-neutral-100">
                  <ListingImage src={image.url} alt={image.label} />
                </span>
                <span className="block p-1.5 text-center text-[11px] font-medium text-loqme-neutral-800 truncate">
                  {image.label}
                </span>
              </RippleButton>
            ))}
          </div>
        </div>
      )}
      {value && (
        <div className={cover ? "space-y-3" : "flex items-center gap-3"}>
          <div
            className={
              cover
                ? "merchant-profile-cover"
                : "relative h-20 w-28 overflow-hidden rounded-lg"
            }
          >
            <ListingImage src={value} alt="تصویر انتخاب‌شده" />
          </div>
          <RippleButton
            className="icon-button"
            type="button"
            aria-label="حذف تصویر"
            onClick={() => onChange("")}
          >
            <X size={18} />
          </RippleButton>
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
