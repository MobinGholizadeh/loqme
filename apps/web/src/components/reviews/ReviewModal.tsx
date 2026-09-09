'use client';

import React, { useState } from 'react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  merchantName: string;
  onSuccess?: () => void;
}

export function ReviewModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  merchantName,
  onSuccess,
}: ReviewModalProps) {
  const [overallRating, setOverallRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [valueRating, setValueRating] = useState(5);
  const [commentFa, setCommentFa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          overallRating,
          qualityRating,
          valueRating,
          commentFa: commentFa.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'خطا در ثبت نظر');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (
    label: string,
    value: number,
    onChange: (val: number) => void
  ) => {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-1.5 direction-ltr" dir="ltr">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="p-1 text-xl transition-transform hover:scale-110 focus:outline-none"
              title={`${star} ستاره`}
            >
              <span
                className={
                  star <= value
                    ? 'text-amber-400 drop-shadow-sm'
                    : 'text-gray-200'
                }
              >
                ★
              </span>
            </button>
          ))}
          <span className="text-xs font-semibold text-gray-500 w-4 text-center">
            {value.toLocaleString('fa-IR')}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      dir="rtl"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              ثبت نظر و امتیاز خریدار
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
          <div className="py-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h4 className="text-base font-bold text-gray-800">
              با تشکر از ثبت نظر شما!
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              نظر شما به عنوان خریدار تایید شده در صفحه فروشگاه قرار گرفت.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Rating categories */}
            <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
              {renderStars('امتیاز کلی تجربه خرید', overallRating, setOverallRating)}
              {renderStars('کیفیت و سلامت خوراکی', qualityRating, setQualityRating)}
              {renderStars('ارزش بسته در برابر قیمت', valueRating, setValueRating)}
            </div>

            {/* Comment */}
            <div>
              <label
                htmlFor="reviewComment"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                توضیحات و بازخورد شما (اختیاری)
              </label>
              <textarea
                id="reviewComment"
                rows={3}
                value={commentFa}
                onChange={(e) => setCommentFa(e.target.value)}
                maxLength={500}
                placeholder="آیا از محتویات بسته شگفت‌انگیز راضی بودید؟ برخورد پرسنل چطور بود؟"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition placeholder:text-gray-400 text-gray-800 resize-none"
              />
              <div className="flex justify-between items-center mt-1 text-[11px] text-gray-400">
                <span>نظر شما عمومی بوده و به سایر خریداران در تصمیم‌گیری کمک می‌کند.</span>
                <span>{commentFa.length.toLocaleString('fa-IR')} / ۵۰۰</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-xl shadow-md shadow-teal-700/20 transition flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>در حال ثبت...</span>
                  </>
                ) : (
                  <span>ثبت امتیاز و نظر</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
