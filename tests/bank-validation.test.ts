import { describe, expect, it } from 'vitest';
import {
  IRANIAN_BANKS,
  normalizeShaba,
  isValidShaba,
  getBankFromShaba,
  CreateBankAccountSchema,
  UpdateBankAccountSchema,
  CreatePayoutRequestSchema,
  AdminReviewBankAccountSchema,
  AdminReviewPayoutRequestSchema,
} from '@loqme/validation';

describe('Iranian Shaba Validation & Bank Catalog', () => {
  // Known valid test Sheba numbers with valid ISO 7064 Mod 97-10 checksums:
  // Bank Mellat (012)
  const validMellatShaba = 'IR820120000000001234567890'; // 82 + 012 + 000000001234567890 -> check mod97
  // Bank Melli (017)
  const validMelliShaba = 'IR040170000000123456789012';
  // Bank Saman (056)
  const validSamanShaba = 'IR680560000000000012345678';
  // Bank Pasargad (057)
  const validPasargadShaba = 'IR350570000000000012345678';

  it('contains comprehensive Iranian banks in catalog', () => {
    expect(IRANIAN_BANKS.length).toBeGreaterThanOrEqual(30);
    const codes = IRANIAN_BANKS.map((b) => b.code);
    expect(codes).toContain('012'); // ملت
    expect(codes).toContain('017'); // ملی
    expect(codes).toContain('018'); // تجارت
    expect(codes).toContain('019'); // صادرات
    expect(codes).toContain('056'); // سامان
    expect(codes).toContain('057'); // پاسارگاد
    expect(codes).toContain('011'); // کشاورزی
    expect(codes).toContain('062'); // آینده
    expect(codes).toContain('054'); // پارسیان
    expect(codes).toContain('061'); // شهر
    expect(codes).toContain('078'); // خاورمیانه
    expect(codes).toContain('060'); // مهر ایران
    expect(codes).toContain('070'); // رسالت
  });

  describe('normalizeShaba', () => {
    it('normalizes Persian digits to English digits and adds IR prefix if missing', () => {
      // Persian digits for 820120000000001234567890
      const persianRaw = '۸۲۰۱۲۰۰۰۰۰۰۰۰۰۱۲۳۴۵۶۷۸۹۰';
      const normalized = normalizeShaba(persianRaw);
      expect(normalized).toBe('IR820120000000001234567890');
    });

    it('cleans whitespace, hyphens, and lowercase ir prefix', () => {
      const raw = ' ir 82-012-0000-0000-0123-4567-890 ';
      expect(normalizeShaba(raw)).toBe('IR820120000000001234567890');
    });

    it('returns empty string if input is empty or invalid', () => {
      expect(normalizeShaba('')).toBe('');
      expect(normalizeShaba('   ')).toBe('');
      expect(normalizeShaba(null as unknown as string)).toBe('');
    });
  });

  describe('isValidShaba', () => {
    // Generate valid checksum for any 22-digit bban to test mod 97 precisely:
    // bban: 0120000000001234567890
    // IR -> 1827. IR00 -> 00. bban + 182700
    // remainder = (bban + 182700) % 97
    // check_digits = 98 - remainder
    function makeValidShaba(bankCode: string, accountNumDigits: string): string {
      const paddedAcc = accountNumDigits.padStart(19, '0');
      const bban = bankCode + paddedAcc; // 22 digits
      const checkString = bban + '182700';
      const remainder = Number(BigInt(checkString) % BigInt(97));
      const checkDigits = (98 - remainder).toString().padStart(2, '0');
      return `IR${checkDigits}${bban}`;
    }

    it('validates mathematically correct Iranian Sheba numbers', () => {
      const shabaMellat = makeValidShaba('012', '123456789');
      const shabaMelli = makeValidShaba('017', '987654321');
      const shabaSaman = makeValidShaba('056', '555444333');

      expect(isValidShaba(shabaMellat)).toBe(true);
      expect(isValidShaba(shabaMelli)).toBe(true);
      expect(isValidShaba(shabaSaman)).toBe(true);
    });

    it('rejects invalid checksums', () => {
      const valid = makeValidShaba('012', '123456789');
      // Tamper with check digits
      const corruptedCheck = valid.slice(0, 2) + (valid[2] === '1' ? '2' : '1') + valid.slice(3);
      expect(isValidShaba(corruptedCheck)).toBe(false);

      // Tamper with account digit
      const corruptedAcc = valid.slice(0, 25) + (valid[25] === '0' ? '1' : '0');
      expect(isValidShaba(corruptedAcc)).toBe(false);
    });

    it('rejects Sheba with incorrect length or bad format', () => {
      expect(isValidShaba('IR12345')).toBe(false);
      expect(isValidShaba('IR820120000000001234567890123')).toBe(false); // too long
      expect(isValidShaba('DE820120000000001234567890')).toBe(false); // non-IR
      expect(isValidShaba('IR82012000000000123456789X')).toBe(false); // non-digit
      expect(isValidShaba('')).toBe(false);
    });
  });

  describe('getBankFromShaba', () => {
    function makeValidShaba(bankCode: string): string {
      const bban = bankCode + '0000000000012345678';
      const remainder = Number(BigInt(bban + '182700') % BigInt(97));
      const checkDigits = (98 - remainder).toString().padStart(2, '0');
      return `IR${checkDigits}${bban}`;
    }

    it('identifies bank correctly from valid Sheba', () => {
      const mellat = getBankFromShaba(makeValidShaba('012'));
      expect(mellat).toBeDefined();
      expect(mellat?.nameFa).toBe('بانک ملت');
      expect(mellat?.code).toBe('012');

      const pasargad = getBankFromShaba(makeValidShaba('057'));
      expect(pasargad).toBeDefined();
      expect(pasargad?.nameFa).toBe('بانک پاسارگاد');

      const saman = getBankFromShaba(makeValidShaba('056'));
      expect(saman).toBeDefined();
      expect(saman?.nameFa).toBe('بانک سامان');
    });

    it('returns null for unknown bank code or invalid shaba', () => {
      expect(getBankFromShaba('IR009990000000000000000000')).toBeNull();
      expect(getBankFromShaba('')).toBeNull();
    });
  });

  describe('Zod Schemas', () => {
    function makeValidShaba(bankCode: string = '012'): string {
      const bban = bankCode + '0000000000012345678';
      const remainder = Number(BigInt(bban + '182700') % BigInt(97));
      const checkDigits = (98 - remainder).toString().padStart(2, '0');
      return `IR${checkDigits}${bban}`;
    }

    it('CreateBankAccountSchema validates and sanitizes correct input', () => {
      const valid = makeValidShaba('012');
      const parsed = CreateBankAccountSchema.safeParse({
        shabaNumber: `  ${valid.toLowerCase()}  `,
        bankName: '  بانک ملت  ',
        accountHolder: '  علی همت‌نیا  ',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.shabaNumber).toBe(valid);
        expect(parsed.data.bankName).toBe('بانک ملت');
        expect(parsed.data.accountHolder).toBe('علی همت‌نیا');
      }
    });

    it('CreateBankAccountSchema rejects bad shaba or empty fields', () => {
      expect(CreateBankAccountSchema.safeParse({
        shabaNumber: 'IR000000000000000000000000',
        bankName: 'بانک',
        accountHolder: 'نام',
      }).success).toBe(false);

      expect(CreateBankAccountSchema.safeParse({
        shabaNumber: makeValidShaba('012'),
        bankName: '',
        accountHolder: 'نام',
      }).success).toBe(false);

      expect(CreateBankAccountSchema.safeParse({
        shabaNumber: makeValidShaba('012'),
        bankName: 'بانک',
        accountHolder: '  ',
      }).success).toBe(false);
    });

    it('UpdateBankAccountSchema handles partial and full updates', () => {
      expect(UpdateBankAccountSchema.safeParse({
        accountHolder: 'نام جدید',
      }).success).toBe(true);

      expect(UpdateBankAccountSchema.safeParse({
        shabaNumber: 'invalid',
      }).success).toBe(false);
    });

    it('CreatePayoutRequestSchema requires positive amount and valid bankAccountId', () => {
      expect(CreatePayoutRequestSchema.safeParse({
        bankAccountId: '00000000-0000-0000-0000-000000000001',
        amountToman: 50000,
        notesFa: 'تسویه هفتگی',
      }).success).toBe(true);

      // below minimum amount (10,000) rejected
      expect(CreatePayoutRequestSchema.safeParse({
        bankAccountId: '00000000-0000-0000-0000-000000000001',
        amountToman: 5000,
      }).success).toBe(false);

      expect(CreatePayoutRequestSchema.safeParse({
        bankAccountId: '00000000-0000-0000-0000-000000000001',
        amountToman: 0,
      }).success).toBe(false);

      expect(CreatePayoutRequestSchema.safeParse({
        bankAccountId: '00000000-0000-0000-0000-000000000001',
        amountToman: -10000,
      }).success).toBe(false);

      // bad bankAccountId rejected
      expect(CreatePayoutRequestSchema.safeParse({
        bankAccountId: 'invalid-id',
        amountToman: 50000,
      }).success).toBe(false);
    });

    it('AdminReviewBankAccountSchema validates approval and rejection', () => {
      expect(AdminReviewBankAccountSchema.safeParse({
        action: 'APPROVE',
      }).success).toBe(true);

      expect(AdminReviewBankAccountSchema.safeParse({
        action: 'REJECT',
        rejectionReason: 'عدم تطابق نام صاحب حساب با پروانه کسب',
      }).success).toBe(true);
    });

    it('AdminReviewPayoutRequestSchema validates all transitions', () => {
      expect(AdminReviewPayoutRequestSchema.safeParse({
        action: 'APPROVE',
      }).success).toBe(true);

      expect(AdminReviewPayoutRequestSchema.safeParse({
        action: 'REJECT',
        rejectionReason: 'مسدودی حساب مقصد',
      }).success).toBe(true);

      expect(AdminReviewPayoutRequestSchema.safeParse({
        action: 'REJECT',
      }).success).toBe(false);

      expect(AdminReviewPayoutRequestSchema.safeParse({
        action: 'COMPLETE',
        trackingReference: 'PAYA-14030730-889900',
      }).success).toBe(true);

      // COMPLETE without tracking reference rejected
      expect(AdminReviewPayoutRequestSchema.safeParse({
        action: 'COMPLETE',
      }).success).toBe(false);
    });
  });
});
