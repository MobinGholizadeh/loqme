import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: {
    extractSessionToken: vi.fn(),
    verifySessionToken: vi.fn(),
  },
  adminAuth: {
    requireAdminSession: vi.fn(),
  },
  supportService: {
    listConversations: vi.fn(),
    getOrCreateCustomerConversation: vi.fn(),
    getOrCreateMerchantConversation: vi.fn(),
    getConversation: vi.fn(),
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
    updateConversationStatus: vi.fn(),
    getUnreadBadgeCounts: vi.fn(),
  },
}));

vi.mock('@/lib/auth/session', () => mocks.auth);
vi.mock('@/lib/auth/admin-auth', () => mocks.adminAuth);
vi.mock('@/domain/support/support.service', () => ({
  supportService: mocks.supportService,
}));
vi.mock('@/lib/db/context', () => ({
  withDatabaseActor: vi.fn((_actor, fn) => fn()),
}));

import * as conversationsRoute from '../apps/web/src/app/api/support/conversations/route';
import * as conversationItemRoute from '../apps/web/src/app/api/support/conversations/[id]/route';
import * as conversationMessagesRoute from '../apps/web/src/app/api/support/conversations/[id]/messages/route';
import * as conversationReadRoute from '../apps/web/src/app/api/support/conversations/[id]/read/route';
import * as conversationStatusRoute from '../apps/web/src/app/api/support/conversations/[id]/status/route';
import * as badgeRoute from '../apps/web/src/app/api/support/badge/route';

const makeReq = (url: string, method = 'GET', body?: unknown) =>
  new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  });

const makeParams = (id = 'conv-123') => ({
  params: Promise.resolve({ id }),
});

describe('Support API Route Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/support/conversations', () => {
    it('returns 401 if unauthenticated', async () => {
      mocks.auth.extractSessionToken.mockReturnValue(null);
      const req = makeReq('http://localhost:3100/api/support/conversations');
      const res = await conversationsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it('returns conversation list for authenticated user', async () => {
      mocks.auth.extractSessionToken.mockReturnValue('valid-token');
      mocks.auth.verifySessionToken.mockResolvedValue({
        userId: 'user-1',
        role: 'CUSTOMER',
      });
      mocks.supportService.listConversations.mockResolvedValue({
        items: [{ id: 'conv-1', title: 'کاربر لقمه', status: 'OPEN', unreadCount: 0 }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const req = makeReq('http://localhost:3100/api/support/conversations');
      const res = await conversationsRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(1);
    });
  });

  describe('POST /api/support/conversations', () => {
    it('creates customer conversation and sends initial message if provided', async () => {
      mocks.auth.extractSessionToken.mockReturnValue('valid-token');
      mocks.auth.verifySessionToken.mockResolvedValue({
        userId: 'user-1',
        role: 'CUSTOMER',
      });
      mocks.supportService.getOrCreateCustomerConversation.mockResolvedValue({
        id: 'conv-1',
        channelType: 'CUSTOMER_ADMIN',
        status: 'OPEN',
      });
      mocks.supportService.sendMessage.mockResolvedValue({
        id: 'msg-1',
        body: 'سلام، راهنمایی لازم دارم',
      });
      mocks.supportService.getConversation.mockResolvedValue({
        id: 'conv-1',
        channelType: 'CUSTOMER_ADMIN',
        status: 'OPEN',
        messages: [{ id: 'msg-1', body: 'سلام، راهنمایی لازم دارم' }],
      });

      const req = makeReq('http://localhost:3100/api/support/conversations', 'POST', {
        channelType: 'CUSTOMER_ADMIN',
        subject: 'راهنمایی',
        initialMessage: 'سلام، راهنمایی لازم دارم',
      });

      const res = await conversationsRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mocks.supportService.getOrCreateCustomerConversation).toHaveBeenCalledWith(
        'user-1',
        'راهنمایی'
      );
      expect(mocks.supportService.sendMessage).toHaveBeenCalled();
    });

    it('creates merchant conversation without initial message', async () => {
      mocks.auth.extractSessionToken.mockReturnValue('valid-token');
      mocks.auth.verifySessionToken.mockResolvedValue({
        userId: 'merchant-user-1',
        role: 'MERCHANT_OWNER',
      });
      mocks.supportService.getOrCreateMerchantConversation.mockResolvedValue({
        id: 'conv-merchant-1',
        channelType: 'MERCHANT_ADMIN',
        status: 'OPEN',
      });

      const req = makeReq('http://localhost:3100/api/support/conversations', 'POST', {
        channelType: 'MERCHANT_ADMIN',
        subject: 'پشتیبانی فروشگاه',
      });

      const res = await conversationsRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('conv-merchant-1');
      expect(mocks.supportService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/support/conversations/[id]', () => {
    it('returns conversation details', async () => {
      mocks.auth.extractSessionToken.mockReturnValue('valid-token');
      mocks.auth.verifySessionToken.mockResolvedValue({
        userId: 'user-1',
        role: 'CUSTOMER',
      });
      mocks.supportService.getConversation.mockResolvedValue({
        id: 'conv-123',
        status: 'OPEN',
        messages: [],
      });

      const req = makeReq('http://localhost:3100/api/support/conversations/conv-123');
      const res = await conversationItemRoute.GET(req, makeParams('conv-123'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.id).toBe('conv-123');
    });
  });

  describe('POST /api/support/conversations/[id]/messages', () => {
    it('validates body and sends message', async () => {
      mocks.auth.extractSessionToken.mockReturnValue('valid-token');
      mocks.auth.verifySessionToken.mockResolvedValue({
        userId: 'user-1',
        role: 'CUSTOMER',
      });
      mocks.supportService.sendMessage.mockResolvedValue({
        id: 'msg-2',
        body: 'متن پاسخ',
      });

      const req = makeReq(
        'http://localhost:3100/api/support/conversations/conv-123/messages',
        'POST',
        { body: 'متن پاسخ' }
      );
      const res = await conversationMessagesRoute.POST(req, makeParams('conv-123'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.id).toBe('msg-2');
    });

    it('rejects empty message body with 400', async () => {
      mocks.auth.extractSessionToken.mockReturnValue('valid-token');
      mocks.auth.verifySessionToken.mockResolvedValue({
        userId: 'user-1',
        role: 'CUSTOMER',
      });

      const req = makeReq(
        'http://localhost:3100/api/support/conversations/conv-123/messages',
        'POST',
        { body: '' }
      );
      const res = await conversationMessagesRoute.POST(req, makeParams('conv-123'));
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/support/conversations/[id]/read', () => {
    it('marks conversation messages as read', async () => {
      mocks.auth.extractSessionToken.mockReturnValue('valid-token');
      mocks.auth.verifySessionToken.mockResolvedValue({
        userId: 'user-1',
        role: 'CUSTOMER',
      });
      mocks.supportService.markAsRead.mockResolvedValue({
        success: true,
        markedCount: 3,
      });

      const req = makeReq(
        'http://localhost:3100/api/support/conversations/conv-123/read',
        'POST'
      );
      const res = await conversationReadRoute.POST(req, makeParams('conv-123'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.markedCount).toBe(3);
    });
  });

  describe('PATCH /api/support/conversations/[id]/status', () => {
    it('updates status when called by admin', async () => {
      mocks.adminAuth.requireAdminSession.mockResolvedValue({
        session: { userId: 'admin-1', role: 'ADMIN' },
      });
      mocks.supportService.updateConversationStatus.mockResolvedValue({
        id: 'conv-123',
        status: 'RESOLVED',
      });

      const req = makeReq(
        'http://localhost:3100/api/support/conversations/conv-123/status',
        'PATCH',
        { status: 'RESOLVED' }
      );
      const res = await conversationStatusRoute.PATCH(req, makeParams('conv-123'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('RESOLVED');
    });
  });

  describe('GET /api/support/badge', () => {
    it('returns unread badge count', async () => {
      mocks.auth.extractSessionToken.mockReturnValue('valid-token');
      mocks.auth.verifySessionToken.mockResolvedValue({
        userId: 'user-1',
        role: 'CUSTOMER',
      });
      mocks.supportService.getUnreadBadgeCounts.mockResolvedValue({
        unreadCount: 4,
      });

      const req = makeReq('http://localhost:3100/api/support/badge');
      const res = await badgeRoute.GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.unreadCount).toBe(4);
    });
  });
});
