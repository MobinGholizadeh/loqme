import type { MerchantRatingSummaryDto } from "@loqme/types";
import { RATING_LABELS } from "./rating-labels";
import { toPersianDigits } from "@/lib/utils/persian";
import { Star } from "lucide-react";

export function MerchantRatings({ ratings }: { ratings?: MerchantRatingSummaryDto }) {
  return <section aria-label="امتیازهای خریداران" className="merchant-ratings">
    <header className="merchant-ratings-heading">
      <div><h2>تجربه کلی خریداران</h2><p>{ratings?.overallRating.count
        ? `بر اساس ${toPersianDigits(ratings.overallRating.count)} نظر خریداران تأییدشده`
        : "۰ نظر"}</p></div>
      <div className="rating-overall">
        <strong>{toPersianDigits((ratings?.overallRating.average ?? 0).toFixed(1))}</strong>
        <span><Star size={14} aria-hidden="true"/> از ۵</span>
      </div>
    </header>
    {(["collectionRating", "qualityRating", "varietyRating", "quantityRating"] as const).map(key => {
      const score = ratings?.[key];
      return <div className="merchant-rating" key={key}>
        <div className="merchant-rating-label"><h3>{RATING_LABELS[key]}</h3>
          {!!score?.count && <span>بر اساس {toPersianDigits(score.count)} امتیاز</span>}</div>
          <div className="merchant-rating-score"><div className="rating-meter" aria-hidden="true"><span style={{ width: `${(score?.average ?? 0) * 20}%` }}/></div>
          <strong aria-label={score?.count ? `${(score.average ?? 0).toFixed(1)} از ۵` : "هنوز امتیازی ثبت نشده"}>{toPersianDigits((score?.average ?? 0).toFixed(1))}</strong></div>
      </div>;
    })}
  </section>;
}
