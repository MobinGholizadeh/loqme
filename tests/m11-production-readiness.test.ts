import { describe, it, expect } from 'vitest';
import nextConfig from '../apps/web/next.config.mjs';
import { envSchema, validateEnv } from '../apps/web/src/core/config';
import { scrubSensitiveData, logger } from '../apps/web/src/lib/logger';
import { GET as getLiveHealth } from '../apps/web/src/app/api/health/live/route';
import { GET as getReadyHealth } from '../apps/web/src/app/api/health/ready/route';
import {
  createDatabaseBackup,
  verifyBackupIntegrity,
  pruneOldBackups,
  generateChecksum,
} from '../scripts/backup-db';
import { PaymentService } from '../apps/web/src/domain/payment/payment.service';
import { PaymentGatewayType } from '@prisma/client';
import { canAccessPath } from '@loqme/types';
import fs from 'fs';
import path from 'path';

describe('Milestone M11 — Production Readiness Verification Suite', () => {
  // =========================================================================
  // 1. Health Probes & Observability (CP-11.4)
  // =========================================================================
  describe('1. Health Check Probes & Observability', () => {
    it('liveness probe returns HTTP 200 with process health and memory stats', async () => {
      const response = await getLiveHealth();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe('ok');
      expect(json.service).toBe('loqme-web');
      expect(typeof json.uptimeSeconds).toBe('number');
      expect(json.memoryUsage).toBeDefined();
      expect(typeof json.memoryUsage.rssMb).toBe('number');
      expect(json.timestamp).toBeDefined();
    });

    it('readiness probe executes database ping and returns structured check', async () => {
      const response = await getReadyHealth();
      // Status can be 200 (DB online) or 503 (DB offline in unit testing environment)
      expect([200, 503]).toContain(response.status);

      const json = await response.json();
      expect(['ready', 'unhealthy']).toContain(json.status);
      expect(json.service).toBe('loqme-web');
      expect(json.checks.database).toBeDefined();
      expect(typeof json.checks.database.latencyMs).toBe('number');
    });

    it('structured logger scrubs sensitive credentials and personal data', () => {
      const dirtyPayload = {
        orderId: 'LQ-1001',
        amountToman: 25000,
        password: 'SuperSecretPassword123',
        otp: '12345',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        session: 'cookie_session_hash',
        secret: 'encryption_secret_key',
        cardNumber: '6037991812345678',
        cvv: '123',
        nationalCode: '0012345678',
        metadata: {
          nestedOtp: '98765',
          safeNote: 'Customer pickup scheduled for 18:00',
        },
      };

      const clean = scrubSensitiveData(dirtyPayload);

      expect(clean.orderId).toBe('LQ-1001');
      expect(clean.amountToman).toBe(25000);
      expect(clean.password).toBe('[REDACTED]');
      expect(clean.otp).toBe('[REDACTED]');
      expect(clean.token).toBe('[REDACTED]');
      expect(clean.session).toBe('[REDACTED]');
      expect(clean.secret).toBe('[REDACTED]');
      expect(clean.cardNumber).toBe('[REDACTED]');
      expect(clean.cvv).toBe('[REDACTED]');
      expect(clean.nationalCode).toBe('[REDACTED]');
      expect(clean.metadata.nestedOtp).toBe('[REDACTED]');
      expect(clean.metadata.safeNote).toBe('Customer pickup scheduled for 18:00');
    });

    it('logger writes structured log entries with timestamp and service tag', () => {
      const entry = logger.info('Test log event', {
        action: 'ORDER_RESERVED',
        correlationId: 'req-test-123',
        amountToman: 50000,
        otp: 'secret-otp',
      });

      expect(entry.level).toBe('info');
      expect(entry.message).toBe('Test log event');
      expect(entry.service).toBe('loqme-platform');
      expect(entry.correlationId).toBe('req-test-123');
      expect(entry.context?.amountToman).toBe(50000);
      expect(entry.context?.otp).toBe('[REDACTED]');
      expect(entry.timestamp).toBeDefined();
    });
  });

  // =========================================================================
  // 2. Production Security Headers & Container Output (CP-11.1 & CP-11.5)
  // =========================================================================
  describe('2. Security Headers & Next.js Container Configuration', () => {
    it('configures standalone output for lightweight container builds', () => {
      expect(nextConfig.output).toBe('standalone');
      expect(nextConfig.reactStrictMode).toBe(true);
    });

    it('enforces mandatory enterprise security headers across all routes', async () => {
      expect(typeof nextConfig.headers).toBe('function');
      const routeHeaders = await nextConfig.headers!();

      const globalRule = routeHeaders.find((r: any) => r.source === '/(.*)');
      expect(globalRule).toBeDefined();

      const headerMap = new Map<string, string>();
      for (const h of globalRule!.headers) {
        headerMap.set(h.key, h.value);
      }

      // Verify Strict-Transport-Security (HSTS)
      expect(headerMap.get('Strict-Transport-Security')).toContain('max-age=63072000');
      expect(headerMap.get('Strict-Transport-Security')).toContain('includeSubDomains');

      // Anti-clickjacking & MIME sniffing protection
      expect(headerMap.get('X-Frame-Options')).toBe('DENY');
      expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

      // Permissions policy restricting sensor access
      expect(headerMap.get('Permissions-Policy')).toContain('camera=(self)');
      expect(headerMap.get('Permissions-Policy')).toContain('microphone=()');

      // Content Security Policy
      const csp = headerMap.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
    });
  });

  // =========================================================================
  // 3. Environment Variable Validation & Production Rules (CP-11.1)
  // =========================================================================
  describe('3. Environment Hygiene & Validation', () => {
    it('validates a correct environment configuration', () => {
      const validConfig = validateEnv({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/loqme?schema=public',
        SESSION_SECRET: 'production-super-strong-jwt-secret-key-at-least-32-chars-long',
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'https://loqme.shop',
      });

      expect(validConfig.NODE_ENV).toBe('production');
      expect(validConfig.NEXT_PUBLIC_APP_URL).toBe('https://loqme.shop');
    });

    it('rejects SESSION_SECRET shorter than 32 characters', () => {
      expect(() => {
        validateEnv({
          DATABASE_URL: 'postgresql://localhost:5432/loqme',
          SESSION_SECRET: 'short_secret',
          NODE_ENV: 'development',
        });
      }).toThrow();
    });

    it('strictly forbids the default development placeholder secret in production mode', () => {
      expect(() => {
        validateEnv({
          DATABASE_URL: 'postgresql://localhost:5432/loqme',
          SESSION_SECRET: 'loqme-development-session-super-secret-key-change-in-production-32c',
          NODE_ENV: 'production',
          STRICT_PROD_CHECK: 'true',
        });
      }).toThrow(/Default development SESSION_SECRET is strictly prohibited in production mode/);
    });
  });

  // =========================================================================
  // 4. Payment Resilience & Gateway Health (CP-11.2)
  // =========================================================================
  describe('4. Payment Resilience & Gateway Failover', () => {
    it('verifies mock gateway health and zero crash handling', async () => {
      const paymentService = new PaymentService();
      const health = await paymentService.checkGatewayHealth(PaymentGatewayType.MOCK);

      expect(health.healthy).toBe(true);
      expect(health.gateway).toBe(PaymentGatewayType.MOCK);
      expect(typeof health.latencyMs).toBe('number');
    });

    it('verifies zarinpal gateway resolution and healthy initialization', async () => {
      const paymentService = new PaymentService();
      const health = await paymentService.checkGatewayHealth(PaymentGatewayType.ZARINPAL);

      expect(health.healthy).toBe(true);
      expect(health.gateway).toBe(PaymentGatewayType.ZARINPAL);
      expect(typeof health.latencyMs).toBe('number');
    });
  });

  // =========================================================================
  // 5. Automated Database Backup & Disaster Recovery Drill (CP-11.6)
  // =========================================================================
  describe('5. Database Backup & Disaster Recovery Routine', () => {
    const testBackupDir = path.resolve(process.cwd(), 'backups-test');

    it('creates gzip-compressed backup with SHA256 checksum and verifies integrity', async () => {
      const sampleSqlDump =
        '-- Loqme Test Database Dump\nCREATE TABLE "User" (id text, mobile text);\nINSERT INTO "User" VALUES (\'u1\', \'09121112222\');\n';

      const backup = await createDatabaseBackup(sampleSqlDump, {
        backupDir: testBackupDir,
      });

      expect(backup.success).toBe(true);
      expect(backup.sizeBytes).toBeGreaterThan(0);
      expect(fs.existsSync(backup.filepath)).toBe(true);
      expect(fs.existsSync(`${backup.filepath}.sha256`)).toBe(true);

      // Verify integrity
      const verification = verifyBackupIntegrity(backup.filepath);
      expect(verification.valid).toBe(true);
      expect(verification.decompressedBytes).toBe(Buffer.from(sampleSqlDump, 'utf-8').length);

      // Cleanup
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    });

    it('detects corrupted or tampered backup files during restore drill', async () => {
      const sampleSql = 'SELECT 1;';
      const backup = await createDatabaseBackup(sampleSql, {
        backupDir: testBackupDir,
      });

      // Tamper with the compressed file by appending garbage
      fs.appendFileSync(backup.filepath, Buffer.from('TAMPERED_CONTENT'));

      const verification = verifyBackupIntegrity(backup.filepath);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBeDefined();

      // Cleanup
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    });
  });

  // =========================================================================
  // 6. Security Boundaries & Authorization Hardening (CP-11.1)
  // =========================================================================
  describe('6. Authorization Boundaries & Access Control', () => {
    it('shields administrative and merchant private routes from unauthorized customers', () => {
      // Unauthenticated visitor
      expect(canAccessPath(null, '/admin')).toBe(false);
      expect(canAccessPath(null, '/merchant')).toBe(false);
      expect(canAccessPath(null, '/')).toBe(true);
      expect(canAccessPath(null, '/explore')).toBe(true);

      // Authenticated customer
      expect(canAccessPath('CUSTOMER', '/admin')).toBe(false);
      expect(canAccessPath('CUSTOMER', '/admin/finance')).toBe(false);
      expect(canAccessPath('CUSTOMER', '/merchant')).toBe(false);
      expect(canAccessPath('CUSTOMER', '/orders')).toBe(true);
      expect(canAccessPath('CUSTOMER', '/profile')).toBe(true);

      // Store staff
      expect(canAccessPath('MERCHANT_STAFF', '/merchant')).toBe(true);
      expect(canAccessPath('MERCHANT_STAFF', '/admin')).toBe(false);

      // Admin
      expect(canAccessPath('ADMIN', '/admin')).toBe(true);
      expect(canAccessPath('ADMIN', '/admin/analytics')).toBe(true);
    });
  });
});
