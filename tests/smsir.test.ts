import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SmsIrNotificationService,
  normalizeIranianMobile,
} from '../apps/web/src/lib/notifications/smsir';

describe('SmsIrNotificationService & Iranian Mobile Normalization', () => {
  describe('normalizeIranianMobile', () => {
    it('normalizes standard 09 numbers', () => {
      expect(normalizeIranianMobile('09123456789')).toBe('09123456789');
    });

    it('normalizes +98 format', () => {
      expect(normalizeIranianMobile('+989123456789')).toBe('09123456789');
    });

    it('normalizes 0098 format', () => {
      expect(normalizeIranianMobile('00989123456789')).toBe('09123456789');
    });

    it('normalizes 98 without plus format', () => {
      expect(normalizeIranianMobile('989123456789')).toBe('09123456789');
    });

    it('normalizes 10-digit number missing leading 0', () => {
      expect(normalizeIranianMobile('9123456789')).toBe('09123456789');
    });

    it('normalizes Persian digits to ASCII', () => {
      expect(normalizeIranianMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
      expect(normalizeIranianMobile('+۹۸۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    });
  });

  describe('SmsIrNotificationService API Dispatch', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('throws if apiKey is not provided', () => {
      expect(() => new SmsIrNotificationService({ apiKey: '' })).toThrow();
    });

    it('sends OTP via /v1/send/verify when templateId is configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          message: 'موفق',
          data: { messageId: 101, cost: 1 },
        }),
      });
      globalThis.fetch = mockFetch;

      const service = new SmsIrNotificationService({
        apiKey: 'test-api-key-123',
        templateId: 998877,
        codeParamName: 'Code',
      });

      const success = await service.sendOtp('+989123456789', '54321');
      expect(success).toBe(true);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.sms.ir/v1/send/verify');
      expect(options.headers['x-api-key']).toBe('test-api-key-123');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body).toEqual({
        mobile: '09123456789',
        templateId: 998877,
        parameters: [{ name: 'Code', value: '54321' }],
      });
    });

    it('falls back to /v1/send/bulk when templateId is not configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          message: 'موفق',
          data: { messageIds: [102], cost: 1 },
        }),
      });
      globalThis.fetch = mockFetch;

      const service = new SmsIrNotificationService({
        apiKey: 'test-api-key-123',
        lineNumber: 30002108039036,
      });

      const success = await service.sendOtp('09123456789', '98765');
      expect(success).toBe(true);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.sms.ir/v1/send/bulk');
      expect(options.headers['x-api-key']).toBe('test-api-key-123');

      const body = JSON.parse(options.body);
      expect(body.lineNumber).toBe(30002108039036);
      expect(body.mobiles).toEqual(['09123456789']);
      expect(body.messageText).toContain('98765');
      expect(body.sendDateTime).toBeNull();
    });

    it('handles non-200 HTTP response gracefully and returns false', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });
      globalThis.fetch = mockFetch;

      const service = new SmsIrNotificationService({
        apiKey: 'invalid-key',
        templateId: 100,
      });

      const success = await service.sendOtp('09123456789', '12345');
      expect(success).toBe(false);
    });

    it('handles business failure status from SMS.ir (status !== 1)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 0,
          message: 'اعتبار کافی نیست',
        }),
      });
      globalThis.fetch = mockFetch;

      const service = new SmsIrNotificationService({
        apiKey: 'test-api-key',
        templateId: 100,
      });

      const success = await service.sendOtp('09123456789', '12345');
      expect(success).toBe(false);
    });

    it('handles network exceptions gracefully and returns false', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection reset'));
      globalThis.fetch = mockFetch;

      const service = new SmsIrNotificationService({
        apiKey: 'test-api-key',
        templateId: 100,
      });

      const success = await service.sendOtp('09123456789', '12345');
      expect(success).toBe(false);
    });

    it('dispatches sendOrderConfirmation via /v1/send/bulk', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          message: 'موفق',
        }),
      });
      globalThis.fetch = mockFetch;

      const service = new SmsIrNotificationService({
        apiKey: 'test-api-key',
        lineNumber: 30002108039036,
      });

      const success = await service.sendOrderConfirmation(
        '09123456789',
        'ORD-1001',
        '۱۸:۰۰ الی ۲۰:۰۰'
      );
      expect(success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.sms.ir/v1/send/bulk');
      const body = JSON.parse(options.body);
      expect(body.mobiles).toEqual(['09123456789']);
      expect(body.messageText).toContain('ORD-1001');
      expect(body.messageText).toContain('۱۸:۰۰ الی ۲۰:۰۰');
    });

    it('dispatches sendPickupReminder via /v1/send/bulk', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          message: 'موفق',
        }),
      });
      globalThis.fetch = mockFetch;

      const service = new SmsIrNotificationService({
        apiKey: 'test-api-key',
        lineNumber: 30002108039036,
      });

      const success = await service.sendPickupReminder('09123456789', 'ORD-1001', 15);
      expect(success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.sms.ir/v1/send/bulk');
      const body = JSON.parse(options.body);
      expect(body.mobiles).toEqual(['09123456789']);
      expect(body.messageText).toContain('ORD-1001');
      expect(body.messageText).toContain('15');
    });
  });

  describe('getNotificationService factory', () => {
    it('returns ConsoleMockNotificationService by default when SMS_PROVIDER is console', async () => {
      const { getNotificationService, resetNotificationService } = await import(
        '../apps/web/src/lib/notifications'
      );
      const { ConsoleMockNotificationService } = await import(
        '../apps/web/src/lib/notifications/console-mock'
      );

      resetNotificationService();
      const service = getNotificationService();
      expect(service).toBeInstanceOf(ConsoleMockNotificationService);
    });
  });
});

