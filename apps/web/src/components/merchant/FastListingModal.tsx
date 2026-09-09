'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatToman, toPersianDigits, toEnglishDigits } from '@/lib/utils/persian';

interface FastListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: () => void;
}

const PRESET_TEMPLATES = [
  {
    id: 'bakery-bread',
    titleFa: 'بسته نان تازه سنتی و فانتزی',
    categorySlug: 'bakery',
    descriptionFa: 'شامل چند نوع نان تازه پخت امروز (سنگک، بربری و باگت فرانسوی) با کیفیت عالی و کاملاً تازه.',
    suggestedOriginal: 80000,
    suggestedDiscounted: 40000,
    defaultQuantity: 6,
    icon: '🥖',
    badge: 'نانوایی',
    temperature: 'ROOM_TEMP',
    allergens: ['گلوتن', 'کنجد'],
  },
  {
    id: 'pastry-sweets',
    titleFa: 'بسته شیرینی تر و کیک عصرانه',
    categorySlug: 'pastry',
    descriptionFa: 'مجموعه دست‌چین از رولت، شیرینی دانمارکی و کیک‌های تازه عصرانه تولید کارگاه امروز.',
    suggestedOriginal: 160000,
    suggestedDiscounted: 75000,
    defaultQuantity: 4,
    icon: '🍰',
    badge: 'قنادی',
    temperature: 'REFRIGERATED',
    allergens: ['تخم‌مرغ', 'لبنیات', 'گلوتن'],
  },
  {
    id: 'restaurant-meal',
    titleFa: 'بسته غذای روز و سوپرپرسی رستورانی',
    categorySlug: 'restaurant',
    descriptionFa: 'خوراک یا چلوکباب لذیذ با برنج ایرانی طبخ امروز ظهر، کاملاً گرم، تازه و دست‌نخورده.',
    suggestedOriginal: 220000,
    suggestedDiscounted: 110000,
    defaultQuantity: 5,
    icon: '🍲',
    badge: 'رستوران',
    temperature: 'HEATED',
    allergens: [],
  },
  {
    id: 'cafe-salad',
    titleFa: 'بسته سالاد تازه، دسر و نوشیدنی کافه',
    categorySlug: 'cafe',
    descriptionFa: 'سالاد سزار تازه آماده‌شده، کروسان شکلاتی و اسموتی یا آبمیوه طبیعی روز.',
    suggestedOriginal: 140000,
    suggestedDiscounted: 65000,
    defaultQuantity: 3,
    icon: '🥗',
    badge: 'کافه',
    temperature: 'REFRIGERATED',
    allergens: ['شیر', 'مغزیجات'],
  },
];

export const FastListingModal: React.FC<FastListingModalProps> = ({
  isOpen,
  onClose,
  onListingCreated,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('pastry-sweets');
  const [titleFa, setTitleFa] = useState<string>('بسته شیرینی تر و کیک عصرانه');
  const [categorySlug, setCategorySlug] = useState<string>('pastry');
  const [descriptionFa, setDescriptionFa] = useState<string>(
    'مجموعه دست‌چین از رولت، شیرینی دانمارکی و کیک‌های تازه عصرانه تولید کارگاه امروز.'
  );
  const [originalPrice, setOriginalPrice] = useState<number>(160000);
  const [discountedPrice, setDiscountedPrice] = useState<number>(75000);
  const [quantity, setQuantity] = useState<number>(4);
  const [pickupStart, setPickupStart] = useState<string>('19:30');
  const [pickupEnd, setPickupEnd] = useState<string>('21:30');
  const [temperatureReq, setTemperatureReq] = useState<string>('REFRIGERATED');
  const [safetyConfirmed, setSafetyConfirmed] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: typeof PRESET_TEMPLATES[0]) => {
    setSelectedTemplateId(template.id);
    setTitleFa(template.titleFa);
    setCategorySlug(template.categorySlug);
    setDescriptionFa(template.descriptionFa);
    setOriginalPrice(template.suggestedOriginal);
    setDiscountedPrice(template.suggestedDiscounted);
    setQuantity(template.defaultQuantity);
    setTemperatureReq(template.temperature);
  };

  const discountPercent =
    originalPrice > 0 && discountedPrice < originalPrice
      ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!safetyConfirmed) {
      setErrorMessage('لطفاً انطباق اقلام با استاندارد بهداشت و سلامت لقمه را تایید فرمایید');
      return;
    }

    if (discountedPrice >= originalPrice) {
      setErrorMessage('قیمت فروش باید کمتر از قیمت اصلی منو باشد');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/merchant/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug,
          titleFa,
          descriptionFa,
          originalPriceToman: originalPrice,
          discountedPriceToman: discountedPrice,
          quantity,
          pickupStart,
          pickupEnd,
          temperatureRequirement: temperatureReq,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onListingCreated();
        onClose();
      } else {
        setErrorMessage(json.message || 'خطا در ثبت بسته');
      }
    } catch {
      setErrorMessage('ارتباط با سرور برقرار نشد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-loqme-neutral-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-loqme-neutral-200">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-loqme-primary-100 flex items-center justify-center text-xl">
              ⚡
            </span>
            <div>
              <h2 className="text-lg font-black text-loqme-neutral-900">
                ثبت سریع بسته مازاد (زیر ۶۰ ثانیه)
              </h2>
              <p className="text-xs text-loqme-neutral-500">
                تعریف بسته شگفت‌انگیز روز با الگوهای آماده و انتشار آنی در بازار
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-loqme-neutral-400 hover:bg-loqme-neutral-100 text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
            <span>❌ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}>✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Step 1: Preset Templates Selection */}
          <div>
            <label className="block text-xs font-bold text-loqme-neutral-700 mb-2">
              ۱. انتخاب الگوی آماده بسته روز (با یک کلیک):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESET_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-loqme-primary-600 bg-loqme-primary-50 ring-2 ring-loqme-primary-400/20'
                        : 'border-loqme-neutral-200 bg-white hover:border-loqme-neutral-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{tmpl.icon}</div>
                    <div>
                      <span className="text-[10px] font-bold text-loqme-primary-700 bg-loqme-primary-100/60 px-1.5 py-0.5 rounded">
                        {tmpl.badge}
                      </span>
                      <h4 className="font-black text-xs text-loqme-neutral-900 mt-1 line-clamp-1">
                        {tmpl.titleFa}
                      </h4>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Title and Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="عنوان نمایشی بسته در بازار"
                value={titleFa}
                onChange={(e) => setTitleFa(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-loqme-neutral-700 mb-1">
                توضیحات محتویات بسته
              </label>
              <input
                type="text"
                value={descriptionFa}
                onChange={(e) => setDescriptionFa(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-loqme-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-loqme-primary-500"
                required
              />
            </div>
          </div>

          {/* Step 3: Prices, Discount & Quantity */}
          <div className="p-4 rounded-2xl bg-loqme-neutral-50 border border-loqme-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-loqme-neutral-800">
                ۲. تعیین قیمت و تعداد موجودی مازاد امروز:
              </label>
              {discountPercent > 0 && (
                <Badge variant="brand" size="md">
                  {toPersianDigits(discountPercent)}٪ تخفیف مشتری
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-loqme-neutral-600 mb-1">
                  قیمت اصلی در منو (تومان):
                </label>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(Number(toEnglishDigits(e.target.value)))}
                  step={1000}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-loqme-neutral-300 rounded-xl text-left focus:ring-2 focus:ring-loqme-primary-500"
                  required
                />
                <span className="text-[10px] text-loqme-neutral-400 mt-0.5 block">
                  {formatToman(originalPrice)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-loqme-primary-700 font-bold mb-1">
                  قیمت فروش شگفت‌انگیز (تومان):
                </label>
                <input
                  type="number"
                  value={discountedPrice}
                  onChange={(e) => setDiscountedPrice(Number(toEnglishDigits(e.target.value)))}
                  step={1000}
                  className="w-full px-3 py-2 text-sm font-mono font-black border-2 border-loqme-primary-500 rounded-xl text-left bg-white text-loqme-primary-800 focus:ring-2 focus:ring-loqme-primary-500"
                  required
                />
                <span className="text-[10px] text-loqme-primary-600 font-bold mt-0.5 block">
                  {formatToman(discountedPrice)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-loqme-neutral-600 mb-1">
                  تعداد بسته مازاد موجود:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl border border-loqme-neutral-300 bg-white font-black text-lg hover:bg-loqme-neutral-100"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono font-black text-lg text-loqme-neutral-900">
                    {toPersianDigits(quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                    className="w-9 h-9 rounded-xl border border-loqme-neutral-300 bg-white font-black text-lg hover:bg-loqme-neutral-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Pickup Window Timing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-loqme-neutral-700 mb-1">
                شروع بازه تحویل امروز:
              </label>
              <input
                type="text"
                value={pickupStart}
                onChange={(e) => setPickupStart(toEnglishDigits(e.target.value))}
                placeholder="19:30"
                className="w-full px-3 py-2 text-center font-mono text-sm font-bold border border-loqme-neutral-300 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-loqme-neutral-700 mb-1">
                پایان بازه تحویل امروز:
              </label>
              <input
                type="text"
                value={pickupEnd}
                onChange={(e) => setPickupEnd(toEnglishDigits(e.target.value))}
                placeholder="21:30"
                className="w-full px-3 py-2 text-center font-mono text-sm font-bold border border-loqme-neutral-300 rounded-xl"
                required
              />
            </div>
          </div>

          {/* Safety & Quality Declaration */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={safetyConfirmed}
                onChange={(e) => setSafetyConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-loqme-primary-600 focus:ring-loqme-primary-500"
              />
              <span className="text-[11px] leading-relaxed font-medium">
                <strong>تعهد سلامت و کیفیت لقمه:</strong> تایید می‌نمایم محتویات این بسته کاملاً تازه،
                بهداشتی، تاریخ‌دار و مازاد مصرف روز بوده و به هیچ وجه شامل غذای دست‌خورده یا منقضی‌شده نمی‌باشد.
              </span>
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-loqme-neutral-200">
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !safetyConfirmed}
              className="gap-2 px-6 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" variant="white" />
                  <span>در حال انتشار در بازار...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>انتشار آنی در بازار لقمه</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
