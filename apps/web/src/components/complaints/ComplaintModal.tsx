'use client';

import React, { useState, useRef } from 'react';
import { ComplaintCategory } from '@loqme/types';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  merchantName: string;
  onSuccess?: () => void;
}

const CATEGORIES: { id: ComplaintCategory; label: string; isSafety: boolean }[] = [
  { id: 'EXPIRED_FOOD', label: 'تاریخ انقضا گذشته (اولویت بحرانی)', isSafety: true },
  { id: 'SPOILED_FOOD', label: 'فساد، بوی نامطبوع یا تغییر رنگ (اولویت بحرانی)', isSafety: true },
  { id: 'MISMATCHED_DESCRIPTION', label: 'عدم تطابق با مشخصات بسته', isSafety: false },
  { id: 'POOR_HYGIENE', label: 'عدم رعایت اصول بهداشتی', isSafety: false },
  { id: 'STORE_CLOSED', label: 'فروشگاه در زمان تحویل بسته بود', isSafety: false },
  { id: 'MISSING_ITEMS', label: 'کسری یا آسیب اقلام', isSafety: false },
  { id: 'OTHER', label: 'سایر موارد', isSafety: false },
];

export function ComplaintModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  merchantName,
  onSuccess,
}: ComplaintModalProps) {
  const [category, setCategory] = useState<ComplaintCategory>('MISMATCHED_DESCRIPTION');
  const [descriptionFa, setDescriptionFa] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidencePhotos.length + files.length > 4) {
      setError('حداکثر ۴ تصویر مدرک می‌توانید بارگذاری کنید');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/complaints/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'خطا در آپلود تصاویر');
      }

      setEvidencePhotos((prev) => [...prev, ...data.urls]);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری تصاویر مدارک');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setEvidencePhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (descriptionFa.trim().length < 10) {
      setError('لطفاً توضیحات را حداقل در ۱۰ کاراکتر وارد کنید');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          category,
          descriptionFa: descriptionFa.trim(),
          evidencePhotos,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'خطا در ثبت شکایت');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = CATEGORIES.find((c) => c.id === category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      dir="rtl"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 overflow-hidden max-h-[90vh] flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="text-rose-600">🛡️</span>
              ثبت گزارش و پیگیری مشکل
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              سفارش <span className="font-mono text-teal-800">{orderNumber}</span> • فروشگاه {merchantName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-10 text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-14 h-14 mb-3 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h4 className="text-base font-bold text-gray-800">
              گزارش شما با موفقیت ثبت شد
            </h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              تیم تضمین کیفیت و بهداشت لقمه ظرف حداکثر ۲ ساعت موضوع را بررسی و در صورت تایید مغایرت، استرداد وجه انجام خواهد شد.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                نوع مشکل یا گزارش را انتخاب کنید:
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition text-right ${
                        isSelected
                          ? cat.isSafety
                            ? 'bg-rose-50 border-rose-500 text-rose-800 font-bold'
                            : 'bg-teal-50 border-teal-600 text-teal-900 font-bold'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat.isSafety && <span className="ml-1 text-rose-600">🚨</span>}
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Safety alert banner */}
            {selectedCategoryObj?.isSafety && (
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <div>
                  <span className="font-bold">خط‌مشی صفر مسامحه در سلامت غذا: </span>
                  لقمه هرگز اجازه فروش اقلام تاریخ انقضا گذشته یا فاسد را نمی‌دهد. در صورت تایید این مورد، بسته فوراً مسدود و حساب فروشگاه جریمه خواهد شد.
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label
                htmlFor="complaintDescription"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                شرح دقیق مشکل یا مغایرت <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="complaintDescription"
                rows={3}
                value={descriptionFa}
                onChange={(e) => setDescriptionFa(e.target.value)}
                maxLength={1000}
                required
                placeholder="لطفاً جزییات مشکل پیش آمده را به صورت شفاف بنویسید (مثلاً تاریخ روی برچسب، وضعیت اقلام تحویلی و ...)"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition placeholder:text-gray-400 text-gray-800 resize-none"
              />
              <div className="flex justify-between items-center mt-1 text-[11px] text-gray-400">
                <span>حداقل ۱۰ کاراکتر</span>
                <span>{descriptionFa.length.toLocaleString('fa-IR')} / ۱۰۰۰</span>
              </div>
            </div>

            {/* Evidence photos upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                تصاویر مدارک و فاکتور یا اقلام (تا ۴ تصویر)
              </label>
              
              <div className="flex flex-wrap items-center gap-2">
                {evidencePhotos.map((url, idx) => (
                  <div
                    key={url}
                    className="relative w-16 h-16 rounded-xl border border-gray-200 overflow-hidden bg-gray-100 group"
                  >
                    <img
                      src={url}
                      alt={`مدرک ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-rose-600 transition"
                      title="حذف تصویر"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {evidencePhotos.length < 4 && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 hover:border-teal-600 flex flex-col items-center justify-center text-gray-400 hover:text-teal-600 transition bg-gray-50/50"
                  >
                    {uploading ? (
                      <span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span className="text-xl leading-none">+</span>
                        <span className="text-[9px] mt-0.5">افزودن</span>
                      </>
                    )}
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting || uploading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 rounded-xl shadow-md shadow-rose-700/20 transition flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>در حال ثبت گزارش...</span>
                  </>
                ) : (
                  <span>ارسال گزارش به تیم نظارت</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
