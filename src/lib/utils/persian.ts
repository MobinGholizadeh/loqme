const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Converts English and Arabic numbers into Persian digits
 */
export function toPersianDigits(input: string | number | bigint): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

/**
 * Converts Persian and Arabic digits into standard English ASCII digits
 */
export function toEnglishDigits(input: string): string {
  if (!input) return '';
  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), String(i));
    result = result.replace(new RegExp(ARABIC_DIGITS[i], 'g'), String(i));
  }
  return result;
}

/**
 * Formats amount in Toman with thousand separators and Persian digits
 * e.g. 25000 -> "۲۵,۰۰۰ تومان"
 */
export function formatToman(amount: number | bigint): string {
  const formatted = Number(amount).toLocaleString('en-US');
  return `${toPersianDigits(formatted)} تومان`;
}

/**
 * Validates Iranian mobile phone number format (09xxxxxxxxx or +989xxxxxxxxx)
 */
export function isValidIranianMobile(mobile: string): boolean {
  const cleaned = toEnglishDigits(mobile).trim();
  return /^(?:(?:\+98|0098|98)?0?)(9\d{9})$/.test(cleaned);
}

/**
 * Normalizes Iranian mobile numbers to standard local format (09xxxxxxxxx)
 */
export function normalizeIranianMobile(mobile: string): string {
  const cleaned = toEnglishDigits(mobile).replace(/\s+/g, '').replace(/[-_]/g, '');
  const match = cleaned.match(/^(?:(?:\+98|0098|98)?0?)(9\d{9})$/);
  if (!match) {
    throw new Error('شماره موبایل وارد شده معتبر نمی‌باشد');
  }
  return `0${match[1]}`;
}
