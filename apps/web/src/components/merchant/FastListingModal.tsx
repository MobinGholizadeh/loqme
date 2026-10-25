"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { PickupDetailsFields, emptyPickupDetails } from "./PickupDetailsFields";
import { DialogSurface } from "@/components/ui/DialogSurface";
import * as RedesignIcons from "lucide-react";

import React, { useEffect, useRef, useState } from "react";
import type { FastCreateListingInput } from "@loqme/validation";
import { Select } from "@/components/ui/Select";
import { ListingImagePicker } from "./ListingImagePicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  formatToman,
  toPersianDigits,
  toEnglishDigits,
} from "@/lib/utils/persian";

interface FastListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: () => void;
}

export const PRESET_TEMPLATES = [
  {
    id: "bakery-bread",
    titleFa: "بسته نان تازه سنتی و فانتزی",
    categorySlug: "bakery",
    descriptionFa:
      "شامل چند نوع نان تازه پخت امروز (سنگک، بربری و باگت فرانسوی) با کیفیت عالی و کاملاً تازه",
    suggestedOriginal: 80000,
    suggestedDiscounted: 40000,
    defaultQuantity: 6,
    icon: RedesignIcons.Croissant,
    badge: "نان؛ سنگک، بربری، باگت",
    temperature: "ROOM_TEMP",
    allergens: ["گلوتن", "کنجد"],
  },
  {
    id: "pastry-sweets",
    titleFa: "بسته شیرینی تر و کیک عصرانه",
    categorySlug: "bakery",
    descriptionFa:
      "مجموعه دست‌چین از رولت، شیرینی دانمارکی و کیک‌های تازه عصرانه تولید کارگاه امروز",
    suggestedOriginal: 160000,
    suggestedDiscounted: 75000,
    defaultQuantity: 4,
    icon: RedesignIcons.CakeSlice,
    badge: "شیرینی و کیک",
    temperature: "CHILLED",
    allergens: ["تخم‌مرغ", "لبنیات", "گلوتن"],
  },
  {
    id: "restaurant-meal",
    titleFa: "بسته غذای پخته روز",
    categorySlug: "restaurant",
    descriptionFa:
      "غذای پخته امروز، سرو نشده و نگهداری‌شده در یخچال؛ پیش از مصرف کاملاً گرم شود",
    suggestedOriginal: 220000,
    suggestedDiscounted: 110000,
    defaultQuantity: 5,
    icon: RedesignIcons.Utensils,
    badge: "غذای پخته؛ برنج و خوراک",
    temperature: "CHILLED",
    allergens: [],
  },
  {
    id: "cafe-salad",
    titleFa: "بسته سالاد تازه، دسر و نوشیدنی کافه",
    categorySlug: "cafe",
    descriptionFa:
      "سالاد سزار تازه آماده‌شده، کروسان شکلاتی و اسموتی یا آبمیوه طبیعی روز",
    suggestedOriginal: 140000,
    suggestedDiscounted: 65000,
    defaultQuantity: 3,
    icon: RedesignIcons.Coffee,
    badge: "دسر، سالاد و نوشیدنی",
    temperature: "CHILLED",
    allergens: ["شیر", "مغزیجات"],
  },
  {
    id: "grocery",
    titleFa: "بسته خواربار بسته‌بندی‌شده",
    categorySlug: "supermarket",
    descriptionFa:
      "اقلام پلمب و تاریخ‌دار؛ نام اقلام و تاریخ مصرف هر کدام را درج کنید",
    suggestedOriginal: 150000,
    suggestedDiscounted: 75000,
    defaultQuantity: 3,
    icon: RedesignIcons.ShoppingBasket,
    badge: "خواربار؛ لبنیات و اقلام پلمب",
    temperature: "CHILLED",
    allergens: [],
  },
  {
    id: "produce",
    titleFa: "بسته میوه و سبزیجات تازه",
    categorySlug: "produce",
    descriptionFa:
      "میوه و سبزی سالم؛ نوع اقلام و وزن تقریبی هر بسته را درج کنید",
    suggestedOriginal: 120000,
    suggestedDiscounted: 60000,
    defaultQuantity: 4,
    icon: RedesignIcons.Apple,
    badge: "میوه، سبزی و صیفی",
    temperature: "CHILLED",
    allergens: [],
  },
  {
    id: "deli",
    titleFa: "بسته پروتئینی پلمب و تاریخ‌دار",
    categorySlug: "deli",
    descriptionFa:
      "محصول پروتئینی با بسته‌بندی مجاز و زنجیره سرد معتبر؛ نام، وزن و تاریخ مصرف را درج کنید",
    suggestedOriginal: 200000,
    suggestedDiscounted: 100000,
    defaultQuantity: 2,
    icon: RedesignIcons.PackageCheck,
    badge: "پروتئین؛ محصولات پلمب",
    temperature: "CHILLED",
    allergens: [],
  },
] satisfies Array<{
  id: string;
  titleFa: string;
  categorySlug: string;
  descriptionFa: string;
  suggestedOriginal: number;
  suggestedDiscounted: number;
  defaultQuantity: number;
  icon: typeof RedesignIcons.Coffee;
  badge: string;
  temperature: FastCreateListingInput["temperatureRequirement"];
  allergens: string[];
}>;

const CATEGORY_LABELS: Record<string, string> = {
  bakery: "نان، شیرینی و کیک",
  cafe: "دسر، سالاد و نوشیدنی",
  restaurant: "غذای پخته و وعده آماده",
  supermarket: "خواربار، لبنیات و اقلام بسته‌بندی",
  produce: "میوه، سبزی و صیفی",
  deli: "پروتئین و محصولات پلمب تاریخ‌دار",
};

function futureTime(hoursAhead: number) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

export const FastListingModal: React.FC<FastListingModalProps> = ({
  isOpen,
  onClose,
  onListingCreated,
}) => {
  const [pickupDetails, setPickupDetails] = useState(emptyPickupDetails);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("pastry-sweets");
  const [titleFa, setTitleFa] = useState<string>("بسته شیرینی تر و کیک عصرانه");
  const [categorySlug, setCategorySlug] = useState<string>("bakery");
  const [descriptionFa, setDescriptionFa] = useState<string>(
    "مجموعه دست‌چین از رولت، شیرینی دانمارکی و کیک‌های تازه عصرانه تولید کارگاه امروز",
  );
  const [originalPrice, setOriginalPrice] = useState<number>(160000);
  const [discountedPrice, setDiscountedPrice] = useState<number>(75000);
  const [quantity, setQuantity] = useState<number>(4);
  const [pickupStart, setPickupStart] = useState<string>(() => futureTime(1));
  const [pickupEnd, setPickupEnd] = useState<string>(() => futureTime(3));
  const [temperatureReq, setTemperatureReq] =
    useState<FastCreateListingInput["temperatureRequirement"]>("CHILLED");
  const [allergens, setAllergens] = useState("تخم‌مرغ، لبنیات، گلوتن");
  const [storageInstructions, setStorageInstructions] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [categories, setCategories] = useState<
    Array<{ slug: string; nameFa: string }>
  >([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [safetyConfirmed, setSafetyConfirmed] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    fetch("/api/categories", { signal: controller.signal })
      .then((r) => r.json())
      .then((r) => {
        if (!r.success) throw new Error();
        setCategories(r.data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setErrorMessage(
            "دریافت دسته‌بندی‌ها انجام نشد؛ فرم را دوباره باز کنید",
          );
      });
    return () => controller.abort();
  }, [isOpen]);
  useEffect(() => {
    if (errorMessage) errorRef.current?.focus();
  }, [errorMessage]);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: (typeof PRESET_TEMPLATES)[0]) => {
    setSelectedTemplateId(template.id);
    setTitleFa(template.titleFa);
    setCategorySlug(template.categorySlug);
    setDescriptionFa(template.descriptionFa);
    setOriginalPrice(template.suggestedOriginal);
    setDiscountedPrice(template.suggestedDiscounted);
    setQuantity(template.defaultQuantity);
    setTemperatureReq(template.temperature);
    setAllergens(template.allergens.join("، "));
    setSafetyConfirmed(false);
    setErrorMessage(null);
  };

  const discountPercent =
    originalPrice > 0 && discountedPrice < originalPrice
      ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!imageUrl || !imageUrl.trim()) errors.imageUrl = "تصویر بسته را انتخاب کنید";
    if (!categorySlug) errors.categorySlug = "دسته‌بندی خوراکی را انتخاب کنید";
    if (titleFa.trim().length < 3)
      errors.titleFa = "عنوان بسته حداقل ۳ کاراکتر باشد";
    if (descriptionFa.trim().length < 5)
      errors.descriptionFa = "توضیحات بسته حداقل ۵ کاراکتر باشد";
    if (!originalPrice || originalPrice <= 0)
      errors.originalPriceToman = "قیمت اصلی را وارد کنید";
    if (!discountedPrice || discountedPrice <= 0)
      errors.discountedPriceToman = "قیمت فروش را وارد کنید";
    if (discountedPrice >= originalPrice)
      errors.discountedPriceToman = "قیمت فروش باید کمتر از قیمت اصلی باشد";
    if (!quantity || quantity < 1) errors.quantity = "تعداد باید حداقل ۱ باشد";
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(pickupStart))
      errors.pickupStart = "زمان شروع را مانند ۱۹:۳۰ وارد کنید";
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(pickupEnd))
      errors.pickupEnd = "زمان پایان را مانند ۲۱:۳۰ وارد کنید";
    const minutes = (time: string) => {
      const [hours, mins] = time.split(":").map(Number);
      return hours * 60 + mins;
    };
    if (Object.keys(errors).length === 0 && minutes(pickupEnd) <= minutes(pickupStart))
      errors.pickupEnd = "زمان پایان باید بعد از زمان شروع باشد";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("اطلاعات بسته کامل نیست؛ موارد مشخص‌شده را اصلاح کنید");
      requestAnimationFrame(() => {
        const first = Object.keys(errors)[0];
        const field = formRef.current?.querySelector<HTMLElement>(
          `[data-field="${first}"]`,
        );
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => field?.focus(), 250);
      });
      return;
    }

    if (!safetyConfirmed) {
      setErrorMessage(
        "لطفاً انطباق اقلام با استاندارد بهداشت و سلامت لقمه را تایید فرمایید",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/merchant/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupDetails,
          categorySlug,
          titleFa,
          descriptionFa,
          originalPriceToman: originalPrice,
          discountedPriceToman: discountedPrice,
          quantity,
          pickupStart,
          pickupEnd,
          temperatureRequirement: temperatureReq,
          allergens: allergens
            .split(/[,،]/)
            .map((item) => item.trim())
            .filter(Boolean),
          storageInstructionsFa: storageInstructions || undefined,
          imageUrl,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onListingCreated();
        onClose();
      } else {
        setErrorMessage(json.message || "خطا در ثبت بسته");
      }
    } catch {
      setErrorMessage("ارتباط با سرور برقرار نشد");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogSurface onClose={onClose} label="ثبت بسته فروشگاه">
      <div className="bg-white max-w-2xl w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-loqme-neutral-200">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-lg bg-loqme-primary-100 flex items-center justify-center text-xl">
              <RedesignIcons.Zap size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-loqme-neutral-900">
                ثبت بسته فروشگاه
              </h2>
            </div>
          </div>
          <RippleButton
            aria-label="بستن"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-loqme-neutral-500 hover:bg-loqme-neutral-100 text-lg transition-colors"
          >
            ✕
          </RippleButton>
        </div>

        {errorMessage && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between"
          >
            <span>{errorMessage}{errorMessage.includes('عکس جلد') && <a href="/merchant/settings" className="block mt-2 underline">بارگذاری عکس جلد در تنظیمات فروشگاه</a>}</span>
            <RippleButton aria-label="بستن" onClick={() => setErrorMessage(null)}>
              ✕
            </RippleButton>
          </div>
        )}

        <form
          ref={formRef}
          noValidate
          onSubmit={handleSubmit}
          className="space-y-5 mt-4"
        >
          {/* Step 1: Preset Templates Selection */}
          <div>
            <label className="block text-xs font-bold text-loqme-neutral-700 mb-2">
              نوع محتویات بسته
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PRESET_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <RippleButton
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    aria-pressed={isSelected}
                    className={`p-3 rounded-lg border text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-loqme-primary-600 bg-loqme-primary-50 ring-2 ring-loqme-primary-400/20"
                        : "border-loqme-neutral-200 bg-white hover:border-loqme-neutral-300"
                    }`}
                  >
                    <tmpl.icon size={24} className="mb-2" aria-hidden="true" />
                    <div>
                      <span className="text-[10px] font-bold text-loqme-primary-700 bg-loqme-primary-100/60 px-1.5 py-0.5 rounded">
                        {tmpl.badge}
                      </span>
                      <h4 className="font-black text-xs text-loqme-neutral-900 mt-1">
                        {tmpl.titleFa}
                      </h4>
                    </div>
                  </RippleButton>
                );
              })}
            </div>
          </div>

          {/* Step 2: Title and Description */}
          <Select
            id="merchant-category"
            data-field="categorySlug"
            label="دسته‌بندی خوراکی"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            required
            error={fieldErrors.categorySlug}
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {CATEGORY_LABELS[category.slug] || category.nameFa}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                id="merchant-title"
                data-field="titleFa"
                label="عنوان نمایشی بسته در بازار"
                value={titleFa}
                onChange={(e) => setTitleFa(e.target.value)}
                required
                error={fieldErrors.titleFa}
              />
            </div>
            <div>
              <label
                htmlFor="merchant-field-1"
                className="block text-xs font-medium text-loqme-neutral-700 mb-1"
              >
                توضیحات محتویات بسته
              </label>
              <input
                id="merchant-field-1"
                data-field="descriptionFa"
                type="text"
                value={descriptionFa}
                onChange={(e) => setDescriptionFa(e.target.value)}
                aria-invalid={fieldErrors.descriptionFa ? true : undefined}
                className="w-full px-3 py-2 text-xs border border-loqme-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-loqme-primary-500"
                required
              />
              {fieldErrors.descriptionFa && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {fieldErrors.descriptionFa}
                </p>
              )}
            </div>
          </div>

          <PickupDetailsFields value={pickupDetails} onChange={setPickupDetails}/>
          {fieldErrors.imageUrl && <p role="alert" className="text-sm text-rose-700">{fieldErrors.imageUrl}</p>}
          <div data-field="imageUrl">
            <ListingImagePicker
              value={imageUrl}
              categorySlug={categorySlug}
              onChange={(val) => {
                setImageUrl(val);
                if (val) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.imageUrl;
                    return next;
                  });
                }
              }}
              onBusyChange={setImageBusy}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="دمای نگهداری"
              value={temperatureReq}
              onChange={(e) =>
                setTemperatureReq(
                  e.target
                    .value as FastCreateListingInput["temperatureRequirement"],
                )
              }
              options={[
                { value: "ROOM_TEMP", label: "دمای محیط؛ مناسب اقلام خشک" },
                { value: "CHILLED", label: "یخچالی؛ حفظ زنجیره سرد" },
                { value: "FROZEN", label: "منجمد؛ بدون قطع زنجیره انجماد" },
              ]}
            />
            <Input
              label="مواد حساسیت‌زا"
              value={allergens}
              onChange={(e) => setAllergens(e.target.value)}
            />
          </div>
          <Input
            label="شرایط نگهداری و مصرف"
            value={storageInstructions}
            onChange={(e) => setStorageInstructions(e.target.value)}
          />
          {/* Step 3: Prices, Discount & Quantity */}
          <div className="p-4 rounded-lg bg-loqme-neutral-50 border border-loqme-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-loqme-neutral-800">
                ۲؛ تعیین قیمت و تعداد موجودی مازاد امروز:
              </label>
              {discountPercent > 0 && (
                <Badge variant="brand" size="md">
                  {toPersianDigits(discountPercent)}٪ تخفیف مشتری
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="merchant-field-2"
                  className="block text-[11px] text-loqme-neutral-600 mb-1"
                >
                  قیمت اصلی در منو (تومان):
                </label>
                <input
                  id="merchant-field-2"
                  data-field="originalPriceToman"
                  type="number"
                  value={originalPrice}
                  aria-invalid={
                    fieldErrors.originalPriceToman ? true : undefined
                  }
                  onChange={(e) =>
                    setOriginalPrice(Number(toEnglishDigits(e.target.value)))
                  }
                  step={1000}
                  className="w-full px-3 py-2 text-sm font-bold border border-loqme-neutral-300 rounded-lg text-left focus:ring-2 focus:ring-loqme-primary-500"
                  required
                />
                {fieldErrors.originalPriceToman && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {fieldErrors.originalPriceToman}
                  </p>
                )}
                <span className="text-[10px] text-loqme-neutral-500 mt-0.5 block">
                  {formatToman(originalPrice)}
                </span>
              </div>

              <div>
                <label
                  htmlFor="merchant-field-3"
                  className="block text-[11px] text-loqme-primary-700 font-bold mb-1"
                >
                  قیمت فروش شگفت‌انگیز (تومان):
                </label>
                <input
                  id="merchant-field-3"
                  data-field="discountedPriceToman"
                  type="number"
                  value={discountedPrice}
                  aria-invalid={
                    fieldErrors.discountedPriceToman ? true : undefined
                  }
                  onChange={(e) =>
                    setDiscountedPrice(Number(toEnglishDigits(e.target.value)))
                  }
                  step={1000}
                  className="w-full px-3 py-2 text-sm font-black border-2 border-loqme-primary-500 rounded-lg text-left bg-white text-loqme-primary-800 focus:ring-2 focus:ring-loqme-primary-500"
                  required
                />
                {fieldErrors.discountedPriceToman && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {fieldErrors.discountedPriceToman}
                  </p>
                )}
                <span className="text-[10px] text-loqme-primary-600 font-bold mt-0.5 block">
                  {formatToman(discountedPrice)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-loqme-neutral-600 mb-1">
                  تعداد بسته مازاد موجود:
                </label>
                <div className="flex items-center gap-2">
                  <RippleButton
                    aria-label="کاهش تعداد"
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg border border-loqme-neutral-300 bg-white font-black text-lg hover:bg-loqme-neutral-100"
                  >
                    -
                  </RippleButton>
                  <span className="flex-1 text-center font-black text-lg text-loqme-neutral-900">
                    {toPersianDigits(quantity)}
                  </span>
                  <RippleButton
                    aria-label="افزایش تعداد"
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                    className="w-9 h-9 rounded-lg border border-loqme-neutral-300 bg-white font-black text-lg hover:bg-loqme-neutral-100"
                  >
                    +
                  </RippleButton>
                </div>
                {fieldErrors.quantity && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {fieldErrors.quantity}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Pickup Window Timing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="merchant-field-4"
                className="block text-xs font-bold text-loqme-neutral-700 mb-1"
              >
                شروع بازه تحویل امروز:
              </label>
              <input
                id="merchant-field-4"
                data-field="pickupStart"
                type="text"
                value={pickupStart}
                aria-invalid={fieldErrors.pickupStart ? true : undefined}
                onChange={(e) =>
                  setPickupStart(toEnglishDigits(e.target.value))
                }
                placeholder="19:30"
                className="w-full px-3 py-2 text-center text-sm font-bold border border-loqme-neutral-300 rounded-lg"
                required
              />
              {fieldErrors.pickupStart && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {fieldErrors.pickupStart}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="merchant-field-5"
                className="block text-xs font-bold text-loqme-neutral-700 mb-1"
              >
                پایان بازه تحویل امروز:
              </label>
              <input
                id="merchant-field-5"
                data-field="pickupEnd"
                type="text"
                value={pickupEnd}
                aria-invalid={fieldErrors.pickupEnd ? true : undefined}
                onChange={(e) => setPickupEnd(toEnglishDigits(e.target.value))}
                placeholder="21:30"
                className="w-full px-3 py-2 text-center text-sm font-bold border border-loqme-neutral-300 rounded-lg"
                required
              />
              {fieldErrors.pickupEnd && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {fieldErrors.pickupEnd}
                </p>
              )}
            </div>
          </div>

          {/* Safety & Quality Declaration */}
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={safetyConfirmed}
                onChange={(e) => setSafetyConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-loqme-primary-600 focus:ring-loqme-primary-500"
              />
              <span className="text-[11px] leading-relaxed font-medium">
                <strong>تعهد سلامت و کیفیت لقمه:</strong> تایید می‌نمایم محتویات
                این بسته کاملاً تازه، بهداشتی، تاریخ‌دار و مازاد مصرف روز بوده و
                به هیچ وجه شامل غذای دست‌خورده یا منقضی‌شده نمی‌باشد
              </span>
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-loqme-neutral-200">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={
                isSubmitting ||
                imageBusy ||
                !safetyConfirmed ||
                categories.length === 0
              }
              className="gap-2 px-6 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" variant="white" />
                  <span>در حال انتشار در بازار…</span>
                </>
              ) : (
                <>
                  <RedesignIcons.Send size={18} aria-hidden="true" />
                  <span>انتشار آنی در بازار لقمه</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DialogSurface>
  );
};
