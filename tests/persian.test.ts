import { describe, it, expect } from 'vitest';
import {
  toPersianDigits,
  toEnglishDigits,
  formatToman,
  isValidIranianMobile,
  normalizeIranianMobile,
} from '@/lib/utils/persian';

describe('Persian Formatting and Mobile Utilities', () => {
  it('converts English digits to Persian digits', () => {
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
    expect(toPersianDigits(12345)).toBe('۱۲۳۴۵');
  });

  it('converts Persian digits back to English digits', () => {
    expect(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(toEnglishDigits('۱۲۳۴۵')).toBe('12345');
  });

  it('formats amounts in Toman with thousand separators and Persian digits', () => {
    expect(formatToman(25000)).toBe('۲۵,۰۰۰ تومان');
    expect(formatToman(1250000)).toBe('۱,۲۵۰,۰۰۰ تومان');
  });

  it('validates Iranian mobile numbers accurately', () => {
    // Valid standard numbers
    expect(isValidIranianMobile('09123456789')).toBe(true);
    expect(isValidIranianMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe(true);
    expect(isValidIranianMobile('+989123456789')).toBe(true);
    expect(isValidIranianMobile('00989123456789')).toBe(true);
    expect(isValidIranianMobile('9123456789')).toBe(true);

    // Invalid numbers
    expect(isValidIranianMobile('08123456789')).toBe(false); // Not starting with 9
    expect(isValidIranianMobile('0912345678')).toBe(false); // 10 digits
    expect(isValidIranianMobile('091234567890')).toBe(false); // 12 digits
    expect(isValidIranianMobile('abc')).toBe(false);
  });

  it('normalizes Iranian mobile numbers to standard 09xxxxxxxxx format', () => {
    expect(normalizeIranianMobile('+989123456789')).toBe('09123456789');
    expect(normalizeIranianMobile('00989123456789')).toBe('09123456789');
    expect(normalizeIranianMobile('9123456789')).toBe('09123456789');
    expect(normalizeIranianMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
  });
});
