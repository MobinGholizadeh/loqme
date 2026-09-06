import crypto from 'crypto';

/**
 * Generates a 5-digit cryptographically secure numerical OTP code
 * Range: 10000 to 99999
 */
export function generateOtpCode(): string {
  const codeNumber = crypto.randomInt(10000, 100000);
  return codeNumber.toString();
}

/**
 * Computes a SHA-256 cryptographic hash of a given string (such as an OTP code)
 */
export async function hashOtp(code: string, salt: string = 'loqme-otp-salt'): Promise<string> {
  return crypto.createHash('sha256').update(`${code}:${salt}`).digest('hex');
}

/**
 * Generates a cryptographically random session token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
