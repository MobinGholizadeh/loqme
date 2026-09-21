import type { MerchantRatingSummaryDto } from "@loqme/types";
import { RATING_LABELS } from "./rating-labels";
import { toPersianDigits } from "@/lib/utils/persian";

export function MerchantRatings({ ratings }: { ratings?: MerchantRatingSummaryDto }) {
  return <section aria-label="امتیازهای خریداران" className="merchant-ratings">
    {(["collectionRating", "qualityRating", "varietyRating", "quantityRating"] as const).map(key => {
      const score = ratings?.[key];
      return <div className="merchant-rating" key={key}>
        <h3>{RATING_LABELS[key]}</h3>
        {score && score.count > 0 && score.average !== null ? <>
          <p><strong>{toPersianDigits(score.average.toFixed(1))}</strong><span> از ۵</span></p>
          <div className="rating-meter" aria-hidden="true"><span style={{ width: `${score.average * 20}%` }}/></div>
          <span className="text-xs text-loqme-neutral-600">بر اساس {toPersianDigits(score.count)} امتیاز</span>
        </> : <p className="text-sm text-loqme-neutral-600">هنوز امتیازی ثبت نشده</p>}
      </div>;
    })}
  </section>;
}
