"use client";
import { RippleButton } from "@/components/magicui/ripple-button";


import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toPersianDigits, formatToman } from "@/lib/utils/persian";

export interface FilterState {
  radiusMeters: number;
  businessType?: string;
  maxPrice?: number;
  dietaryTags: string[];
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
}

const RADIUS_OPTIONS = [
  { label: "۵۰۰ متر", value: 500 },
  { label: "۱ کیلومتر", value: 1000 },
  { label: "۳ کیلومتر", value: 3000 },
  { label: "۵ کیلومتر", value: 5000 },
  { label: "۱۰ کیلومتر", value: 10000 },
  { label: "۲۵ کیلومتر", value: 25000 },
];

const BUSINESS_TYPES = [
  { label: "همه کسب‌وکارها", value: "" },
  { label: "نانوایی و شیرینی", value: "BAKERY" },
  { label: "کافه و نوشیدنی", value: "CAFE" },
  { label: "رستوران و کترینگ", value: "RESTAURANT" },
  { label: "سوپرمارکت و میوه", value: "SUPERMARKET" },
  { label: "قنادی و دسر", value: "CONFECTIONERY" },
];

const DIETARY_OPTIONS = [
  { label: "گیاه‌خواری (Vegetarian)", value: "گیاه‌خواری" },
  { label: "وگان (Vegan)", value: "وگان" },
  { label: "بدون گلوتن (Gluten-Free)", value: "بدون گلوتن" },
  { label: "کم‌شکر یا رژیمی", value: "کم‌شکر" },
];

export function FilterModal({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync state when modal opens
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  const handleRadiusChange = (val: number) => {
    setLocalFilters((prev) => ({ ...prev, radiusMeters: val }));
  };

  const handleBusinessTypeChange = (val: string) => {
    setLocalFilters((prev) => ({ ...prev, businessType: val || undefined }));
  };

  const handleDietaryToggle = (tag: string) => {
    setLocalFilters((prev) => {
      const current = prev.dietaryTags;
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { ...prev, dietaryTags: next };
    });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleResetInternal = () => {
    const defaultState: FilterState = {
      radiusMeters: 5000,
      businessType: undefined,
      maxPrice: undefined,
      dietaryTags: [],
    };
    setLocalFilters(defaultState);
    onReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="فیلترهای کشف خوراکی‌ها"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={handleResetInternal}>
            پاک‌سازی فیلترها
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              انصراف
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              اعمال فیلترها
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-sm">
        {/* Radius Selector */}
        <div>
          <label className="block font-bold text-loqme-neutral-900 mb-2">
            شعاع جستجو در اطراف شما:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {RADIUS_OPTIONS.map((opt) => {
              const active = localFilters.radiusMeters === opt.value;
              return (
                <RippleButton
                  key={opt.value}
                  type="button"
                  onClick={() => handleRadiusChange(opt.value)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    active
                      ? "bg-loqme-primary-600 text-white border-loqme-primary-600 shadow-sm"
                      : "bg-white text-loqme-neutral-700 border-loqme-neutral-200 hover:bg-loqme-neutral-50"
                  }`}
                >
                  {opt.label}
                </RippleButton>
              );
            })}
          </div>
        </div>

        {/* Business Type */}
        <div>
          <label className="block font-bold text-loqme-neutral-900 mb-2">
            نوع فروشگاه:
          </label>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map((bt) => {
              const active = (localFilters.businessType || "") === bt.value;
              return (
                <RippleButton
                  key={bt.value}
                  type="button"
                  onClick={() => handleBusinessTypeChange(bt.value)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    active
                      ? "bg-loqme-primary-700 text-white border-loqme-primary-700"
                      : "bg-white text-loqme-neutral-600 border-loqme-neutral-200 hover:bg-loqme-neutral-50"
                  }`}
                >
                  {bt.label}
                </RippleButton>
              );
            })}
          </div>
        </div>

        {/* Dietary Preferences */}
        <div>
          <label className="block font-bold text-loqme-neutral-900 mb-2">
            ویژگی‌های رژیمی و تغذیه‌ای:
          </label>
          <div className="space-y-2">
            {DIETARY_OPTIONS.map((diet) => {
              const checked = localFilters.dietaryTags.includes(diet.value);
              return (
                <label
                  key={diet.value}
                  className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-loqme-neutral-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleDietaryToggle(diet.value)}
                    className="w-4 h-4 rounded border-loqme-neutral-300 text-loqme-primary-600 focus:ring-loqme-primary-500"
                  />
                  <span className="text-xs text-loqme-neutral-800">
                    {diet.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
