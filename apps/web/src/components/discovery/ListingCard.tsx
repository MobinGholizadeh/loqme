import Link from "next/link";
import { Clock3, ArrowLeft, ShieldCheck, MapPin } from "lucide-react";
import { ListingSummaryDto } from "@loqme/types";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { ListingImage } from "@/components/ui/ListingImage";
export function ListingCard({
  listing,
  priority = false,
}: {
  listing: ListingSummaryDto;
  priority?: boolean;
}) {
  return (
    <Link href={`/listings/${listing.id}`} className="listing-card">
      <div className="listing-cover">
        <ListingImage
          src={listing.imageUrl}
          alt={listing.titleFa}
          priority={priority}
        />
        {listing.discountPercent > 0 && (
          <span className="listing-discount">
            {toPersianDigits(listing.discountPercent)}٪ تخفیف
          </span>
        )}
        <span className="listing-stock">
          {toPersianDigits(listing.remainingQuantity)} بسته موجود
        </span>
      </div>
      <div className="listing-card-body">
        <div className="listing-store">
          <span>{listing.storeNameFa}</span>
          {listing.safetyVerified && (
            <ShieldCheck
              size={17}
              aria-label="ایمنی تاییدشده"
              className="text-loqme-success-700"
            />
          )}
        </div>
        <h3>{listing.titleFa}</h3>
        <div className="listing-pickup">
          <MapPin size={15} className="shrink-0" aria-hidden="true" />
          <span>
            {[listing.cityNameFa, listing.neighborhoodNameFa]
              .filter(Boolean)
              .join("، ") ||
              listing.addressFa ||
              "منطقه ثبت نشده"}
          </span>
        </div>
        <div className="listing-pickup">
          <Clock3 size={15} aria-hidden="true" />
          <span>دریافت: {toPersianDigits(listing.pickupWindowFa)}</span>
        </div>
        {listing.distanceMeters != null && (
          <div className="listing-pickup">
            <MapPin size={15} aria-hidden="true" />
            {listing.distanceMeters < 1000
              ? `${toPersianDigits(Math.round(listing.distanceMeters))} متر`
              : `${toPersianDigits((listing.distanceMeters / 1000).toFixed(1))} کیلومتر`}
          </div>
        )}
        <div className="listing-price">
          <div>
            {listing.originalPriceToman > listing.discountedPriceToman && (
              <del>{formatToman(listing.originalPriceToman)}</del>
            )}
            <strong>{formatToman(listing.discountedPriceToman)}</strong>
          </div>
          <span className="icon-button" aria-hidden="true">
            <ArrowLeft size={20} />
          </span>
        </div>
      </div>
    </Link>
  );
}
