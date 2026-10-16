export interface MerchantContextDto {
  id: string;
  nameFa: string;
  role: string;
  locations: { id: string; nameFa: string }[];
}

/** Decimal strings retain integer Toman precision for every client. */
export interface MerchantDataReportDto {
  version: '1';
  merchantId: string;
  locationId: string | null;
  source: 'LOQME_MARKETPLACE';
  timezone: 'Asia/Tehran';
  startIso: string;
  endExclusiveIso: string;
  computedAtIso: string;
  collectionsToman: string;
  refundsToman: string;
  netCollectionsToman: string;
  bookedSalesToman: string;
  bookedCommissionToman: string;
  bookedMerchantPayableToman: string;
  paidOrderCount: number;
  previousPaidOrderCount: number;
  historyCoverageStartIso: string | null;
  pickupCount: number;
  quality: {
    unknownPaymentTimes: number;
    unknownRefundTimes: number;
    unknownLocations: number;
    openReconciliations: number;
    baselineOnly: boolean;
  };
  insights: { code: string; textFa: string; evidence: string[] }[];
}
