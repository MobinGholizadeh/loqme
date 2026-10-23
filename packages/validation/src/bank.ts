import { z } from 'zod';
import { toEnglishDigits } from './index';

export interface IranianBankInfo {
  code: string;
  nameFa: string;
  slug: string;
}

export const IRANIAN_BANKS: IranianBankInfo[] = [
  { code: '010', nameFa: 'بانک مرکزی جمهوری اسلامی ایران', slug: 'central-bank' },
  { code: '011', nameFa: 'بانک صنعت و معدن', slug: 'sanat-o-madan' },
  { code: '012', nameFa: 'بانک ملت', slug: 'mellat' },
  { code: '013', nameFa: 'بانک رفاه کارگران', slug: 'refah' },
  { code: '014', nameFa: 'بانک مسکن', slug: 'maskan' },
  { code: '015', nameFa: 'بانک سپه', slug: 'sepah' },
  { code: '016', nameFa: 'بانک کشاورزی', slug: 'keshavarzi' },
  { code: '017', nameFa: 'بانک ملی ایران', slug: 'melli' },
  { code: '018', nameFa: 'بانک تجارت', slug: 'tejarat' },
  { code: '019', nameFa: 'بانک صادرات ایران', slug: 'saderat' },
  { code: '020', nameFa: 'بانک توسعه صادرات ایران', slug: 'tosee-saderat' },
  { code: '021', nameFa: 'پست بانک ایران', slug: 'post-bank' },
  { code: '022', nameFa: 'بانک توسعه تعاون', slug: 'tosee-taavon' },
  { code: '051', nameFa: 'مؤسسه اعتباری توسعه', slug: 'tosee' },
  { code: '053', nameFa: 'بانک کارآفرین', slug: 'karafarin' },
  { code: '054', nameFa: 'بانک پارسیان', slug: 'parsian' },
  { code: '055', nameFa: 'بانک اقتصاد نوین', slug: 'eghtesad-novin' },
  { code: '056', nameFa: 'بانک سامان', slug: 'saman' },
  { code: '057', nameFa: 'بانک پاسارگاد', slug: 'pasargad' },
  { code: '058', nameFa: 'بانک سرمایه', slug: 'sarmayeh' },
  { code: '059', nameFa: 'بانک سینا', slug: 'sina' },
  { code: '060', nameFa: 'بانک قرض‌الحسنه مهر ایران', slug: 'mehr-iran' },
  { code: '061', nameFa: 'بانک شهر', slug: 'shahr' },
  { code: '062', nameFa: 'بانک آینده', slug: 'ayandeh' },
  { code: '063', nameFa: 'بانک انصار', slug: 'ansar' },
  { code: '064', nameFa: 'بانک گردشگری', slug: 'gardeshgari' },
  { code: '065', nameFa: 'بانک حکمت ایرانیان', slug: 'hekmat' },
  { code: '066', nameFa: 'بانک دی', slug: 'dey' },
  { code: '069', nameFa: 'بانک ایران زمین', slug: 'iran-zamin' },
  { code: '070', nameFa: 'بانک قرض‌الحسنه رسالت', slug: 'resalat' },
  { code: '073', nameFa: 'مؤسسه اعتباری کوثر', slug: 'kosar' },
  { code: '075', nameFa: 'مؤسسه اعتباری ملل', slug: 'melal' },
  { code: '078', nameFa: 'بانک خاورمیانه', slug: 'khavarmianeh' },
  { code: '079', nameFa: 'مؤسسه اعتباری نور', slug: 'noor' },
  { code: '080', nameFa: 'مؤسسه اعتباری کاسپین', slug: 'caspian' },
];

/**
 * Normalizes an Iranian Sheba (IBAN) string.
 * Strips whitespace, dashes, converts Persian digits to English digits,
 * forces uppercase, and prepends 'IR' if 24 digits were provided.
 */
export function normalizeShaba(raw: string): string {
  if (!raw) return '';
  let cleaned = toEnglishDigits(raw).replace(/[\s\-_/.]/g, '').toUpperCase();
  if (!cleaned.startsWith('IR') && /^\d{24}$/.test(cleaned)) {
    cleaned = `IR${cleaned}`;
  }
  return cleaned;
}

/**
 * Validates an Iranian Sheba (IBAN) string using standard ISO 7064 Mod 97-10 algorithm.
 */
export function isValidShaba(raw: string): boolean {
  const shaba = normalizeShaba(raw);
  if (!/^IR\d{24}$/.test(shaba)) {
    return false;
  }

  // Move first 4 characters (IR + 2 checksum digits) to the end:
  // e.g. IR123456... -> 3456...IR12
  const rearranged = shaba.slice(4) + shaba.slice(0, 4);

  // Convert letters to digits: I=18, R=27
  let numericString = '';
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged[i];
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      // A=10, ..., I=18, ..., R=27, ..., Z=35
      numericString += String(code - 55);
    } else {
      numericString += char;
    }
  }

  try {
    return BigInt(numericString) % BigInt(97) === BigInt(1);
  } catch {
    return false;
  }
}

/**
 * Detects the Iranian bank corresponding to a Sheba number (digits 5 to 7).
 */
export function getBankFromShaba(raw: string): IranianBankInfo | null {
  const shaba = normalizeShaba(raw);
  if (shaba.length < 7) return null;
  const bankCode = shaba.substring(4, 7);
  return IRANIAN_BANKS.find((b) => b.code === bankCode) || null;
}

// ==========================================
// Bank Account & Payout Schemas
// ==========================================

export const CreateBankAccountSchema = z.object({
  shabaNumber: z
    .string({ required_error: 'شماره شبا الزامی است' })
    .trim()
    .transform((val) => normalizeShaba(val))
    .refine((val) => isValidShaba(val), {
      message: 'شماره شبا وارد شده نامعتبر است (الگوریتم اعتبارسنجی شبا تایید نشد)',
    }),
  bankName: z
    .string({ required_error: 'نام بانک الزامی است' })
    .trim()
    .min(2, 'نام بانک باید حداقل ۲ حرف باشد')
    .max(100, 'نام بانک حداکثر ۱۰۰ حرف است'),
  accountHolder: z
    .string({ required_error: 'نام و نام خانوادگی صاحب حساب الزامی است' })
    .trim()
    .min(3, 'نام صاحب حساب باید حداقل ۳ حرف باشد')
    .max(120, 'نام صاحب حساب حداکثر ۱۲۰ حرف است'),
  isDefault: z.boolean().optional().default(false),
});

export type CreateBankAccountInput = z.infer<typeof CreateBankAccountSchema>;

export const UpdateBankAccountSchema = z.object({
  shabaNumber: z
    .string()
    .trim()
    .transform((val) => normalizeShaba(val))
    .refine((val) => isValidShaba(val), {
      message: 'شماره شبا وارد شده نامعتبر است',
    })
    .optional(),
  bankName: z
    .string()
    .trim()
    .min(2, 'نام بانک باید حداقل ۲ حرف باشد')
    .max(100, 'نام بانک حداکثر ۱۰۰ حرف است')
    .optional(),
  accountHolder: z
    .string()
    .trim()
    .min(3, 'نام صاحب حساب باید حداقل ۳ حرف باشد')
    .max(120, 'نام صاحب حساب حداکثر ۱۲۰ حرف است')
    .optional(),
});

export type UpdateBankAccountInput = z.infer<typeof UpdateBankAccountSchema>;

export const AdminReviewBankAccountSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], {
    required_error: 'تعیین وضعیت تایید یا رد حساب الزامی است',
  }),
  rejectionReason: z.string().trim().max(500, 'علت رد حداکثر ۵۰۰ حرف است').optional(),
});

export type AdminReviewBankAccountInput = z.infer<typeof AdminReviewBankAccountSchema>;

export const CreatePayoutRequestSchema = z.object({
  bankAccountId: z
    .string({ required_error: 'انتخاب حساب بانکی مقصد الزامی است' })
    .uuid('شناسه حساب بانکی نامعتبر است'),
  amountToman: z
    .number({ required_error: 'مبلغ برداشت الزامی است' })
    .int('مبلغ باید عدد صحیح باشد')
    .min(10000, 'حداقل مبلغ برداشت ۱۰,۰۰۰ تومان است')
    .max(1000000000, 'حداکثر مبلغ برداشت در هر تراکنش ۱,۰۰۰,۰۰۰,۰۰۰ تومان است'),
  notesFa: z.string().trim().max(300, 'توضیحات حداکثر ۳۰۰ حرف است').optional(),
});

export type CreatePayoutRequestInput = z.infer<typeof CreatePayoutRequestSchema>;

export const AdminReviewPayoutRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'COMPLETE'], {
    required_error: 'تعیین وضعیت درخواست تسویه الزامی است',
  }),
  trackingReference: z
    .string()
    .trim()
    .min(3, 'کد پیگیری پایا/ساتنا باید حداقل ۳ کاراکتر باشد')
    .max(100, 'کد پیگیری حداکثر ۱۰۰ کاراکتر است')
    .optional(),
  rejectionReason: z
    .string()
    .trim()
    .min(3, 'در صورت رد درخواست، ذکر علت الزامی است')
    .max(500, 'علت رد حداکثر ۵۰۰ کاراکتر است')
    .optional(),
}).refine(
  (data) => {
    if (data.action === 'COMPLETE' && !data.trackingReference) return false;
    if (data.action === 'REJECT' && !data.rejectionReason) return false;
    return true;
  },
  {
    message: 'کد پیگیری برای تسویه نهایی، یا علت رد برای لغو درخواست الزامی است',
  }
);

export type AdminReviewPayoutRequestInput = z.infer<typeof AdminReviewPayoutRequestSchema>;
