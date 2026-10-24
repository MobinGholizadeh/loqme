import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SupportService,
  SupportChannelType,
  SupportConversationStatus,
  SupportPriority,
  SupportMessageSenderType,
} from '../apps/web/src/domain/support/support.service';
import { Role, StaffRole } from '@prisma/client';
import { prisma } from '../apps/web/src/lib/prisma';
import { supportEvents } from '../apps/web/src/domain/support/support-events';

vi.mock('../apps/web/src/lib/prisma', () => ({
  prisma: {
    supportConversation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    supportMessage: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    supportAttachment: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    merchantStaff: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === 'function') {
        return cb(prisma);
      }
      return Promise.all(cb);
    }),
  },
}));

vi.mock('../apps/web/src/domain/merchant/merchant.service', () => ({
  merchantService: {
    resolveMerchantAndAuthorize: vi.fn(async (userId, merchantId, role) => ({
      merchant: {
        id: merchantId || 'merchant-123',
        businessNameFa: 'نانوایی برکت',
        businessType: 'BAKERY',
        ownerUserId: 'merchant-user-1',
      },
    })),
  },
}));

describe('SupportService', () => {
  let service: SupportService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SupportService();
  });

  describe('authorizeConversationAccess', () => {
    it('allows ADMIN full access to any conversation', async () => {
      vi.mocked(prisma.supportConversation.findUnique).mockResolvedValue({
        id: 'conv-1',
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId: 'cust-1',
        merchantId: null,
      } as any);

      const result = await service.authorizeConversationAccess('conv-1', 'admin-1', Role.ADMIN);
      expect(result.senderType).toBe(SupportMessageSenderType.ADMIN);
    });

    it('allows customer access to their own customer conversation', async () => {
      vi.mocked(prisma.supportConversation.findUnique).mockResolvedValue({
        id: 'conv-1',
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId: 'cust-1',
        merchantId: null,
      } as any);

      const result = await service.authorizeConversationAccess('conv-1', 'cust-1', Role.CUSTOMER);
      expect(result.senderType).toBe(SupportMessageSenderType.CUSTOMER);
    });

    it('rejects customer access to another user conversation', async () => {
      vi.mocked(prisma.supportConversation.findUnique).mockResolvedValue({
        id: 'conv-1',
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId: 'cust-other',
        merchantId: null,
      } as any);

      await expect(
        service.authorizeConversationAccess('conv-1', 'cust-1', Role.CUSTOMER)
      ).rejects.toThrow('دسترسی به این گفتگوی پشتیبانی مجاز نیست');
    });

    it('allows merchant owner access to merchant conversation', async () => {
      vi.mocked(prisma.supportConversation.findUnique).mockResolvedValue({
        id: 'conv-2',
        channelType: SupportChannelType.MERCHANT_ADMIN,
        userId: 'cust-1',
        merchantId: 'merchant-123',
        merchant: { ownerUserId: 'owner-user-1' },
      } as any);

      const result = await service.authorizeConversationAccess('conv-2', 'owner-user-1', Role.MERCHANT_OWNER);
      expect(result.senderType).toBe(SupportMessageSenderType.MERCHANT);
    });
  });

  describe('getOrCreateCustomerConversation', () => {
    it('returns existing conversation if found', async () => {
      const existingConv = {
        id: 'conv-exist',
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId: 'cust-1',
        status: SupportConversationStatus.OPEN,
        priority: SupportPriority.NORMAL,
        unreadCustomerCount: 0,
        unreadMerchantCount: 0,
        unreadAdminCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.supportConversation.findFirst).mockResolvedValue(existingConv as any);

      const result = await service.getOrCreateCustomerConversation('cust-1');
      expect(result.id).toBe('conv-exist');
      expect(prisma.supportConversation.create).not.toHaveBeenCalled();
    });

    it('creates a new conversation if none exists', async () => {
      vi.mocked(prisma.supportConversation.findFirst).mockResolvedValue(null);
      const newConv = {
        id: 'conv-new',
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId: 'cust-1',
        subject: 'پشتیبانی مشتریان',
        status: SupportConversationStatus.OPEN,
        priority: SupportPriority.NORMAL,
        unreadCustomerCount: 0,
        unreadMerchantCount: 0,
        unreadAdminCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.supportConversation.create).mockResolvedValue(newConv as any);

      const result = await service.getOrCreateCustomerConversation('cust-1');
      expect(result.id).toBe('conv-new');
      expect(prisma.supportConversation.create).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('returns existing message if clientMessageId matches (idempotency)', async () => {
      vi.mocked(prisma.supportConversation.findUnique).mockResolvedValue({
        id: 'conv-1',
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId: 'cust-1',
      } as any);

      const existingMessage = {
        id: 'msg-existing',
        conversationId: 'conv-1',
        senderUserId: 'cust-1',
        senderType: SupportMessageSenderType.CUSTOMER,
        clientMessageId: 'cli-123',
        body: 'سلام، سوالی داشتم',
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        attachments: [],
      };

      vi.mocked(prisma.supportMessage.findFirst).mockResolvedValue(existingMessage as any);

      const result = await service.sendMessage({
        conversationId: 'conv-1',
        senderUserId: 'cust-1',
        senderRole: Role.CUSTOMER,
        body: 'سلام، سوالی داشتم',
        clientMessageId: 'cli-123',
      });

      expect(result.id).toBe('msg-existing');
      expect(prisma.supportMessage.create).not.toHaveBeenCalled();
    });

    it('creates new message, updates conversation counters, and emits real-time event', async () => {
      const emitSpy = vi.spyOn(supportEvents, 'emit');

      vi.mocked(prisma.supportConversation.findUnique).mockResolvedValue({
        id: 'conv-1',
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId: 'cust-1',
      } as any);

      vi.mocked(prisma.supportMessage.findFirst).mockResolvedValue(null);

      const createdMsg = {
        id: 'msg-new-1',
        conversationId: 'conv-1',
        senderUserId: 'cust-1',
        senderType: SupportMessageSenderType.CUSTOMER,
        clientMessageId: 'cli-456',
        body: 'پیام تست جدید',
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        attachments: [],
      };

      vi.mocked(prisma.supportMessage.create).mockResolvedValue(createdMsg as any);
      vi.mocked(prisma.supportMessage.findUniqueOrThrow).mockResolvedValue(createdMsg as any);

      const result = await service.sendMessage({
        conversationId: 'conv-1',
        senderUserId: 'cust-1',
        senderRole: Role.CUSTOMER,
        body: 'پیام تست جدید',
        clientMessageId: 'cli-456',
      });

      expect(result.id).toBe('msg-new-1');
      expect(prisma.supportConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: expect.objectContaining({
            unreadAdminCount: { increment: 1 },
            lastMessagePreview: 'پیام تست جدید',
          }),
        })
      );

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message:created',
          conversationId: 'conv-1',
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('marks counterparty messages as read and resets unread counters', async () => {
      const emitSpy = vi.spyOn(supportEvents, 'emit');

      vi.mocked(prisma.supportConversation.findUnique).mockResolvedValue({
        id: 'conv-1',
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId: 'cust-1',
      } as any);

      vi.mocked(prisma.supportMessage.updateMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.supportConversation.update).mockResolvedValue({} as any);

      const result = await service.markAsRead('conv-1', 'cust-1', Role.CUSTOMER);

      expect(result.success).toBe(true);
      expect(result.markedCount).toBe(2);
      expect(prisma.supportConversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { unreadCustomerCount: 0 },
      });
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message:read',
          conversationId: 'conv-1',
        })
      );
    });
  });

  describe('updateConversationStatus', () => {
    it('updates status and emits conversation:status event', async () => {
      const emitSpy = vi.spyOn(supportEvents, 'emit');

      const updatedConv = {
        id: 'conv-1',
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId: 'cust-1',
        status: SupportConversationStatus.RESOLVED,
        priority: SupportPriority.HIGH,
        unreadCustomerCount: 0,
        unreadMerchantCount: 0,
        unreadAdminCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.supportConversation.update).mockResolvedValue(updatedConv as any);

      const result = await service.updateConversationStatus(
        'conv-1',
        'admin-1',
        SupportConversationStatus.RESOLVED,
        SupportPriority.HIGH
      );

      expect(result.status).toBe('RESOLVED');
      expect(result.priority).toBe('HIGH');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'conversation:status',
          conversationId: 'conv-1',
        })
      );
    });
  });
});
