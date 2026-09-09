import { describe, it, expect } from 'vitest';
import {
  UserRole,
  ROLE_HIERARCHY,
  canAccessPath,
  hasMinimumRole,
} from '@loqme/types';
import {
  RequestOtpSchema,
  VerifyOtpSchema,
  isValidIranianMobile,
  formatToman,
} from '@loqme/validation';
import { TOKENS, generateCssVariables } from '@loqme/design-tokens';
import { createApiClient, LoqmeApiError } from '@loqme/api';
import { extractSessionToken } from '@/lib/auth/session';

describe('Shared Packages Architecture Verification', () => {
  describe('@loqme/types', () => {
    it('exports authoritative role hierarchy and access checks', () => {
      expect(ROLE_HIERARCHY.CUSTOMER).toBe(1);
      expect(ROLE_HIERARCHY.ADMIN).toBe(4);
      expect(hasMinimumRole('ADMIN', 'CUSTOMER')).toBe(true);
      expect(hasMinimumRole('CUSTOMER', 'ADMIN')).toBe(false);

      expect(canAccessPath('ADMIN', '/admin/overview')).toBe(true);
      expect(canAccessPath('CUSTOMER', '/admin/overview')).toBe(false);
      expect(canAccessPath('MERCHANT_OWNER', '/merchant/dashboard')).toBe(true);
    });
  });

  describe('@loqme/validation', () => {
    it('validates and formats Iranian mobile numbers and currency universally', () => {
      expect(isValidIranianMobile('09121111111')).toBe(true);
      expect(isValidIranianMobile('08121111111')).toBe(false);

      const parsed = RequestOtpSchema.safeParse({ mobile: '+989123456789' });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.mobile).toBe('09123456789');
      }

      expect(formatToman(75000)).toBe('۷۵,۰۰۰ تومان');
    });
  });

  describe('@loqme/design-tokens', () => {
    it('provides unified White + Teal visual palette and motion tokens', () => {
      expect(TOKENS.colors.primary[600]).toBe('#135E66'); // Base Brand / Teal
      expect(TOKENS.colors.accent[500]).toBe('#65CF9B');  // Template Mint Green
      expect(TOKENS.colors.neutral[0]).toBe('#FFFFFF');    // Clean White Foundation
      expect(TOKENS.motion.scale.activePress).toBe(0.97);

      const cssVars = generateCssVariables();
      expect(cssVars['--brand-teal-600']).toBe('#135E66');
      expect(cssVars['--color-accent']).toBe('#65CF9B');
      expect(cssVars['--bg-canvas']).toBe('#FFFFFF');
    });
  });

  describe('@loqme/api', () => {
    it('instantiates type-safe API client and handles errors properly', () => {
      const client = createApiClient({ baseUrl: 'https://api.loqme.shop' });
      expect(client.auth).toBeDefined();
      expect(typeof client.auth.requestOtp).toBe('function');
      expect(typeof client.auth.verifyOtp).toBe('function');

      const err = new LoqmeApiError('کد تایید منقضی شده است', 400, 'OTP_EXPIRED');
      expect(err.status).toBe(400);
      expect(err.code).toBe('OTP_EXPIRED');
      expect(err.name).toBe('LoqmeApiError');
    });
  });

  describe('Universal Dual-Mode Authentication', () => {
    it('extracts session token from Authorization Bearer header (Mobile)', () => {
      const mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer test-jwt-token-mobile-123',
        }),
      };
      const token = extractSessionToken(mockRequest);
      expect(token).toBe('test-jwt-token-mobile-123');
    });

    it('extracts session token from HttpOnly cookie (Web)', () => {
      const mockRequest = {
        headers: new Headers(),
        cookies: {
          get: (name: string) => (name === 'loqme_session' ? { value: 'test-jwt-token-web-456' } : undefined),
        },
      };
      const token = extractSessionToken(mockRequest);
      expect(token).toBe('test-jwt-token-web-456');
    });

    it('prioritizes Bearer header over cookie when both are present', () => {
      const mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer bearer-token-priority',
        }),
        cookies: {
          get: () => ({ value: 'cookie-token' }),
        },
      };
      const token = extractSessionToken(mockRequest);
      expect(token).toBe('bearer-token-priority');
    });
  });
});
