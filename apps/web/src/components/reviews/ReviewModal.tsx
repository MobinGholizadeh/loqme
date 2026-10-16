"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { DialogSurface } from "@/components/ui/DialogSurface";
import { Button } from "@/components/ui/Button";
import { RATING_LABELS } from "./rating-labels";

interface ReviewModalProps {
  isOpen: boolean; onClose: () => void; orderId: string; orderNumber: string;
  merchantName: string; onSuccess?: () => void;
}
const emptyScores = { overallRating: 0, collectionRating: 0, qualityRating: 0, varietyRating: 0, quantityRating: 0 };
export function ReviewModal({ isOpen, onClose, orderId, orderNumber, merchantName, onSuccess }: ReviewModalProps) {
  const [scores, setScores] = useState(emptyScores);
  const [commentFa, setCommentFa] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (isOpen) { setScores(emptyScores); setCommentFa(""); setError(""); setSuccess(false); }
  }, [isOpen, orderId]);
  if (!isOpen) return null;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (Object.values(scores).some(score => score === 0)) {
      setError("لطفاً برای هر پنج بخش امتیاز انتخاب کنید."); return;
    }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...scores, commentFa: commentFa.trim() || undefined }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "خطا در ثبت نظر");
      setSuccess(true); onSuccess?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ارتباط با سرور برقرار نشد"); }
    finally { setLoading(false); }
  }
  return <DialogSurface onClose={onClose} label="ثبت نظر و امتیاز خریدار">
    <div className="review-panel">
      <header className="flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold">ثبت نظر و امتیاز خریدار</h2>
          <p className="mt-2 text-sm text-loqme-neutral-600">{merchantName} · سفارش {orderNumber}</p></div>
        <RippleButton type="button" className="icon-button" aria-label="بستن" onClick={onClose}><X size={20}/></RippleButton>
      </header>
      {success ? <div className="py-8 space-y-4 text-center" role="status">
        <h3 className="font-bold">با تشکر از ثبت نظر شما!</h3>
        <p>امتیاز شما در نظرات خریداران تاییدشده ثبت شد.</p>
        <Button onClick={onClose}>بستن</Button>
      </div> : <form onSubmit={submit} className="mt-5 space-y-5">
        <p className="text-sm text-loqme-neutral-600">برای هر بخش، از یک تا پنج ستاره انتخاب کنید.</p>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="divide-y divide-loqme-neutral-100">
          {Object.entries(RATING_LABELS).map(([key, label]) => {
            const field = key as keyof typeof scores;
            return <fieldset key={key} className="review-rating-row">
              <legend className="text-sm font-semibold">{label}</legend>
              <div className="flex gap-1" dir="ltr">
                {[1, 2, 3, 4, 5].map(star => <label key={star} className="rating-choice">
                  <input type="radio" name={key} value={star} required checked={scores[field] === star}
                    aria-label={`${label}: ${star.toLocaleString("fa-IR")} ستاره`}
                    onChange={() => setScores(current => ({ ...current, [field]: star }))}/>
                  <Star size={23} aria-hidden="true" fill={star <= scores[field] ? "currentColor" : "none"}/>
                </label>)}
              </div>
            </fieldset>;
          })}
        </div>
        <div><label htmlFor="reviewComment" className="block text-sm font-semibold mb-2">توضیحات و بازخورد شما (اختیاری)</label>
          <textarea id="reviewComment" rows={3} maxLength={500} value={commentFa} onChange={e => setCommentFa(e.target.value)}
            className="w-full rounded-lg border border-loqme-neutral-300 p-3 text-sm"/>
          <p className="text-xs text-loqme-neutral-600 mt-2">نظر شما عمومی است و به انتخاب سایر خریداران کمک می‌کند.</p></div>
        <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={onClose}>انصراف</Button>
          <Button type="submit" disabled={loading}>{loading ? "در حال ثبت…" : "ثبت امتیاز و نظر"}</Button></div>
      </form>}
    </div>
  </DialogSurface>;
}
