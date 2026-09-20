export type BusinessType = 'BAKERY' | 'CAFE' | 'RESTAURANT' | 'SUPERMARKET' | 'DELI' | 'PRODUCE';

export const BUSINESS_TYPES_FA: Record<BusinessType, string> = {
  BAKERY: 'نانوایی و شیرینی‌فروشی', CAFE: 'کافه', RESTAURANT: 'رستوران',
  SUPERMARKET: 'سوپرمارکت', DELI: 'اغذیه‌فروشی', PRODUCE: 'میوه و سبزی‌فروشی',
};
export const WEEKDAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'] as const;
export interface BusinessCityDto {
  id: string; nameFa: string; provinceNameFa: string; slug: string;
  center: { latitude: number; longitude: number } | null;
}
export interface BusinessPlaceDto {
  id: string; providerId: string | null; name: string; address: string;
  latitude: number; longitude: number;
}
export interface BusinessHoursDay {
  dayOfWeek: number; isOpen: boolean; storeOpenTime: string; storeCloseTime: string;
}
export interface MerchantApplicationInput {
  ownerName: string; businessNameFa: string; businessType: BusinessType;
  cityId: string; addressFa: string; latitude: number; longitude: number;
  phone?: string | null; licenseNumber?: string | null; mapirPlaceId?: string | null;
  hours: BusinessHoursDay[];
}
export interface MerchantApplicationDto extends MerchantApplicationInput {
  id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; revision: number;
  reviewReason: string | null; merchantId: string | null;
  cityNameFa: string; createdAt: string; updatedAt: string;
}
export interface AdminMerchantApplicationDto extends MerchantApplicationDto {
  applicantMobile: string;
  duplicates: { id: string; businessNameFa: string; exact: boolean }[];
}
export interface ReviewMerchantApplicationInput {
  decision: 'APPROVED' | 'REJECTED'; reasonFa: string; expectedRevision: number;
}
