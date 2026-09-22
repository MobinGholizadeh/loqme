const dietaryLabels: Record<string, string> = {
  HALAL: 'حلال', VEGETARIAN: 'گیاه‌خواری', VEGAN: 'وگان (کاملاً گیاهی)',
  GLUTEN_FREE: 'بدون گلوتن', DAIRY_FREE: 'بدون لبنیات', LACTOSE_FREE: 'بدون لاکتوز',
  NUT_FREE: 'بدون مغزها', LOW_SUGAR: 'کم‌شکر', SUGAR_FREE: 'بدون شکر', ORGANIC: 'ارگانیک',
};
const allergenLabels: Record<string, string> = {
  GLUTEN: 'گلوتن', DAIRY: 'لبنیات', MILK: 'شیر', EGGS: 'تخم‌مرغ', EGG: 'تخم‌مرغ',
  NUTS: 'مغزها', TREE_NUTS: 'مغزهای درختی', PEANUTS: 'بادام‌زمینی', SOY: 'سویا',
  SESAME: 'کنجد', FISH: 'ماهی', SHELLFISH: 'صدف و سخت‌پوستان',
  CRUSTACEANS: 'سخت‌پوستان', CELERY: 'کرفس', MUSTARD: 'خردل', SULPHITES: 'سولفیت‌ها', LUPIN: 'لوپین',
};
export function foodLabelFa(value: string, kind: 'dietary' | 'allergen'): string {
  const label = (kind === 'dietary' ? dietaryLabels : allergenLabels)[value.trim().toUpperCase().replace(/[ -]/g, '_')];
  if (label) return label;
  if (/[\u0600-\u06ff]/.test(value)) return value;
  return kind === 'allergen' ? 'حساسیت‌زای دیگر؛ از فروشگاه بپرسید' : 'ویژگی دیگر؛ از فروشگاه بپرسید';
}
