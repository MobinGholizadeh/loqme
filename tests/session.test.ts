import { describe, it, expect } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  SessionPayload,
} from '@/lib/auth/session';

describe('Session Cookie & JWT Handling', () => {
  it('creates and verifies a signed session token successfully', async () => {
    const payload: SessionPayload = {
      userId: 'test-user-uuid-123',
      mobile: '09121111111',
      role: 'CUSTOMER',
      fullName: 'سارا محمدی',
    };

    const token = await createSessionToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // Standard JWT header.payload.signature

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.mobile).toBe(payload.mobile);
    expect(decoded?.role).toBe(payload.role);
    expect(decoded?.fullName).toBe(payload.fullName);
  });

  it('rejects tampered tokens', async () => {
    const payload: SessionPayload = {
      userId: 'test-user-uuid-123',
      mobile: '09121111111',
      role: 'CUSTOMER',
    };

    const token = await createSessionToken(payload);
    // Tamper with the token string
    const tampered = token.slice(0, -5) + 'xxxxx';

    const decoded = await verifySessionToken(tampered);
    expect(decoded).toBeNull();
  });

  it('rejects completely invalid strings', async () => {
    const decoded = await verifySessionToken('not-a-token');
    expect(decoded).toBeNull();
  });
});
