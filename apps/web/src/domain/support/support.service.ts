import { prisma } from '@/lib/prisma';
import { Role, StaffRole } from '@prisma/client';
import type {
  SupportChannelType as PrismaSupportChannelType,
  SupportConversationStatus as PrismaSupportConversationStatus,
  SupportPriority as PrismaSupportPriority,
  SupportMessageSenderType as PrismaSupportMessageSenderType,
} from '@prisma/client';

export const SupportChannelType = {
  CUSTOMER_ADMIN: 'CUSTOMER_ADMIN',
  MERCHANT_ADMIN: 'MERCHANT_ADMIN',
} as const;

export const SupportConversationStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export const SupportPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export const SupportMessageSenderType = {
  ADMIN: 'ADMIN',
  MERCHANT: 'MERCHANT',
  CUSTOMER: 'CUSTOMER',
  SYSTEM: 'SYSTEM',
} as const;

export type SupportChannelType = typeof SupportChannelType[keyof typeof SupportChannelType];
export type SupportConversationStatus = typeof SupportConversationStatus[keyof typeof SupportConversationStatus];
export type SupportPriority = typeof SupportPriority[keyof typeof SupportPriority];
export type SupportMessageSenderType = typeof SupportMessageSenderType[keyof typeof SupportMessageSenderType];
import type {
  SupportConversationDto,
  SupportConversationSummaryDto,
  SupportMessageDto,
  SupportAttachmentDto,
} from '@loqme/types';
import type { ConversationFilterInput } from '@loqme/validation';
import { merchantService } from '@/domain/merchant/merchant.service';
import { supportEvents } from './support-events';

export class SupportService {
  /**
   * Helper to verify if a user has access to a conversation
   */
  async authorizeConversationAccess(
    conversationId: string,
    currentUserId: string,
    userRole: Role
  ): Promise<{
    conversation: any;
    senderType: SupportMessageSenderType;
  }> {
    const conversation = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            role: true,
            customer: { select: { fullName: true } },
          },
        },
        merchant: {
          select: {
            id: true,
            businessNameFa: true,
            businessType: true,
            bannerImageUrl: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('گفتگوی پشتیبانی یافت نشد');
    }

    if (userRole === Role.ADMIN) {
      return { conversation, senderType: SupportMessageSenderType.ADMIN };
    }

    if (conversation.channelType === SupportChannelType.CUSTOMER_ADMIN) {
      if (conversation.userId !== currentUserId) {
        throw new Error('دسترسی به این گفتگوی پشتیبانی مجاز نیست');
      }
      return { conversation, senderType: SupportMessageSenderType.CUSTOMER };
    }

    if (conversation.channelType === SupportChannelType.MERCHANT_ADMIN) {
      if (!conversation.merchantId) {
        throw new Error('فروشگاه مرتبط با گفتگو نامعتبر است');
      }
      // Check if user is owner or staff
      const isOwner = conversation.merchant?.ownerUserId === currentUserId;
      const isStaff = await prisma.merchantStaff.findFirst({
        where: {
          merchantId: conversation.merchantId,
          userId: currentUserId,
        },
      });

      if (!isOwner && !isStaff) {
        throw new Error('دسترسی به گفتگوی پشتیبانی فروشگاه مجاز نیست');
      }

      return { conversation, senderType: SupportMessageSenderType.MERCHANT };
    }

    throw new Error('نوع کانال پشتیبانی نامعتبر است');
  }

  /**
   * Get or create a support conversation for a regular customer
   */
  async getOrCreateCustomerConversation(
    userId: string,
    subject?: string
  ): Promise<SupportConversationDto> {
    let conversation = await prisma.supportConversation.findFirst({
      where: {
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId,
        status: { in: [SupportConversationStatus.OPEN, SupportConversationStatus.RESOLVED] },
      },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            customer: { select: { fullName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.supportConversation.create({
        data: {
          channelType: SupportChannelType.CUSTOMER_ADMIN,
          userId,
          subject: subject || 'پشتیبانی مشتریان',
          status: SupportConversationStatus.OPEN,
          priority: SupportPriority.NORMAL,
        },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              customer: { select: { fullName: true } },
            },
          },
        },
      });
    }

    return this.mapConversationToDto(conversation);
  }

  /**
   * Get or create a support conversation for a merchant
   */
  async getOrCreateMerchantConversation(
    merchantUserId: string,
    merchantId?: string,
    subject?: string
  ): Promise<SupportConversationDto> {
    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      merchantUserId,
      merchantId,
      StaffRole.CASHIER
    );

    let conversation = await prisma.supportConversation.findFirst({
      where: {
        channelType: SupportChannelType.MERCHANT_ADMIN,
        merchantId: merchant.id,
        status: { in: [SupportConversationStatus.OPEN, SupportConversationStatus.RESOLVED] },
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessNameFa: true,
            businessType: true,
            bannerImageUrl: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.supportConversation.create({
        data: {
          channelType: SupportChannelType.MERCHANT_ADMIN,
          merchantId: merchant.id,
          userId: merchantUserId,
          subject: subject || `پشتیبانی فروشگاه ${merchant.businessNameFa}`,
          status: SupportConversationStatus.OPEN,
          priority: SupportPriority.NORMAL,
        },
        include: {
          merchant: {
            select: {
              id: true,
              businessNameFa: true,
              businessType: true,
              bannerImageUrl: true,
            },
          },
        },
      });
    }

    return this.mapConversationToDto(conversation);
  }

  /**
   * Get full conversation details with message history
   */
  async getConversation(
    conversationId: string,
    currentUserId: string,
    userRole: Role
  ): Promise<SupportConversationDto> {
    await this.authorizeConversationAccess(conversationId, currentUserId, userRole);

    const conversation = await prisma.supportConversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            customer: { select: { fullName: true } },
          },
        },
        merchant: {
          select: {
            id: true,
            businessNameFa: true,
            businessType: true,
            bannerImageUrl: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                mobile: true,
                role: true,
                customer: { select: { fullName: true } },
              },
            },
            attachments: true,
          },
        },
      },
    });

    return this.mapConversationToDto(conversation);
  }

  /**
   * List conversations for Admin, Merchant, or Customer
   */
  async listConversations(
    currentUserId: string,
    userRole: Role,
    filter: ConversationFilterInput,
    merchantIdParam?: string
  ): Promise<{
    items: SupportConversationSummaryDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: any = {};

    if (filter.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }

    if (filter.channelType && filter.channelType !== 'ALL') {
      where.channelType = filter.channelType;
    }

    if (userRole === Role.ADMIN) {
      if (filter.search) {
        where.OR = [
          { subject: { contains: filter.search, mode: 'insensitive' } },
          { lastMessagePreview: { contains: filter.search, mode: 'insensitive' } },
          { user: { mobile: { contains: filter.search } } },
          { user: { customer: { fullName: { contains: filter.search, mode: 'insensitive' } } } },
          { merchant: { businessNameFa: { contains: filter.search, mode: 'insensitive' } } },
        ];
      }
    } else if (userRole === Role.MERCHANT_OWNER || userRole === Role.MERCHANT_STAFF) {
      const { merchant } = await merchantService.resolveMerchantAndAuthorize(
        currentUserId,
        merchantIdParam,
        StaffRole.CASHIER
      );
      where.channelType = SupportChannelType.MERCHANT_ADMIN;
      where.merchantId = merchant.id;
    } else {
      where.channelType = SupportChannelType.CUSTOMER_ADMIN;
      where.userId = currentUserId;
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [total, conversations] = await Promise.all([
      prisma.supportConversation.count({ where }),
      prisma.supportConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              customer: { select: { fullName: true } },
            },
          },
          merchant: {
            select: {
              id: true,
              businessNameFa: true,
              businessType: true,
              bannerImageUrl: true,
            },
          },
        },
      }),
    ]);

    const items = conversations.map((conv) => {
      const isMerchantChannel = conv.channelType === SupportChannelType.MERCHANT_ADMIN;
      const title = isMerchantChannel
        ? conv.merchant?.businessNameFa || 'فروشگاه'
        : conv.user?.customer?.fullName || conv.user?.mobile || 'کاربر لقمه';
      const subtitle = conv.subject || (isMerchantChannel ? 'پشتیبانی فروشگاه' : 'پشتیبانی کاربر');
      const unreadCount =
        userRole === Role.ADMIN
          ? conv.unreadAdminCount
          : isMerchantChannel
          ? conv.unreadMerchantCount
          : conv.unreadCustomerCount;

      return {
        id: conv.id,
        channelType: conv.channelType,
        userId: conv.userId,
        merchantId: conv.merchantId,
        subject: conv.subject,
        status: conv.status,
        priority: conv.priority,
        lastMessageAt: conv.lastMessageAt?.toISOString() || null,
        lastMessagePreview: conv.lastMessagePreview,
        unreadCount,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        title,
        subtitle,
        avatarUrl: isMerchantChannel ? conv.merchant?.bannerImageUrl : null,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Send a support message with idempotency and real-time broadcast
   */
  async sendMessage(params: {
    conversationId: string;
    senderUserId: string;
    senderRole: Role;
    body: string;
    clientMessageId?: string;
    attachmentIds?: string[];
  }): Promise<SupportMessageDto> {
    const { conversation, senderType } = await this.authorizeConversationAccess(
      params.conversationId,
      params.senderUserId,
      params.senderRole
    );

    // Idempotency check: if clientMessageId exists for this conversation, return existing
    if (params.clientMessageId) {
      const existing = await prisma.supportMessage.findFirst({
        where: {
          conversationId: params.conversationId,
          clientMessageId: params.clientMessageId,
        },
        include: {
          sender: {
            select: {
              id: true,
              mobile: true,
              role: true,
              customer: { select: { fullName: true } },
            },
          },
          attachments: true,
        },
      });

      if (existing) {
        return this.mapMessageToDto(existing);
      }
    }

    // Create the message and update attachments & conversation in a transaction
    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.supportMessage.create({
        data: {
          conversationId: params.conversationId,
          senderUserId: params.senderUserId,
          senderType,
          clientMessageId: params.clientMessageId,
          body: params.body.trim(),
        },
        include: {
          sender: {
            select: {
              id: true,
              mobile: true,
              role: true,
              customer: { select: { fullName: true } },
            },
          },
          attachments: true,
        },
      });

      // Associate uploaded attachments if any
      if (params.attachmentIds && params.attachmentIds.length > 0) {
        await tx.supportAttachment.updateMany({
          where: {
            id: { in: params.attachmentIds },
          },
          data: {
            messageId: createdMessage.id,
          },
        });
      }

      // Update conversation state and counters
      const updateData: any = {
        lastMessageAt: new Date(),
        lastMessagePreview: params.body.trim().slice(0, 150),
        status: SupportConversationStatus.OPEN,
      };

      if (senderType === SupportMessageSenderType.ADMIN) {
        if (conversation.channelType === SupportChannelType.CUSTOMER_ADMIN) {
          updateData.unreadCustomerCount = { increment: 1 };
        } else {
          updateData.unreadMerchantCount = { increment: 1 };
        }
      } else {
        updateData.unreadAdminCount = { increment: 1 };
      }

      await tx.supportConversation.update({
        where: { id: params.conversationId },
        data: updateData,
      });

      // Reload message with attachments
      return tx.supportMessage.findUniqueOrThrow({
        where: { id: createdMessage.id },
        include: {
          sender: {
            select: {
              id: true,
              mobile: true,
              role: true,
              customer: { select: { fullName: true } },
            },
          },
          attachments: true,
        },
      });
    });

    const dto = this.mapMessageToDto(message);

    // Broadcast real-time event
    supportEvents.emit({
      type: 'message:created',
      conversationId: params.conversationId,
      timestamp: new Date().toISOString(),
      payload: {
        message: dto,
      },
    });

    return dto;
  }

  /**
   * Mark messages in a conversation as read
   */
  async markAsRead(
    conversationId: string,
    readerUserId: string,
    readerRole: Role
  ): Promise<{ success: boolean; markedCount: number }> {
    const { conversation } = await this.authorizeConversationAccess(
      conversationId,
      readerUserId,
      readerRole
    );

    const now = new Date();
    let whereCondition: any;
    let conversationUpdate: any;

    if (readerRole === Role.ADMIN) {
      whereCondition = {
        conversationId,
        senderType: { in: [SupportMessageSenderType.CUSTOMER, SupportMessageSenderType.MERCHANT] },
        isRead: false,
      };
      conversationUpdate = { unreadAdminCount: 0 };
    } else if (conversation.channelType === SupportChannelType.CUSTOMER_ADMIN) {
      whereCondition = {
        conversationId,
        senderType: SupportMessageSenderType.ADMIN,
        isRead: false,
      };
      conversationUpdate = { unreadCustomerCount: 0 };
    } else {
      whereCondition = {
        conversationId,
        senderType: SupportMessageSenderType.ADMIN,
        isRead: false,
      };
      conversationUpdate = { unreadMerchantCount: 0 };
    }

    const [updateResult] = await prisma.$transaction([
      prisma.supportMessage.updateMany({
        where: whereCondition,
        data: {
          isRead: true,
          readAt: now,
          readByUserId: readerUserId,
        },
      }),
      prisma.supportConversation.update({
        where: { id: conversationId },
        data: conversationUpdate,
      }),
    ]);

    if (updateResult.count > 0) {
      supportEvents.emit({
        type: 'message:read',
        conversationId,
        timestamp: now.toISOString(),
        payload: {
          readByUserId: readerUserId,
        },
      });
    }

    return { success: true, markedCount: updateResult.count };
  }

  /**
   * Update conversation status and priority (Admin only)
   */
  async updateConversationStatus(
    conversationId: string,
    adminUserId: string,
    status: SupportConversationStatus,
    priority?: SupportPriority
  ): Promise<SupportConversationDto> {
    const isClosed = status === SupportConversationStatus.CLOSED;

    const updated = await prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        status,
        ...(priority ? { priority } : {}),
        closedAt: isClosed ? new Date() : null,
        closedByUserId: isClosed ? adminUserId : null,
      },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            customer: { select: { fullName: true } },
          },
        },
        merchant: {
          select: {
            id: true,
            businessNameFa: true,
            businessType: true,
            bannerImageUrl: true,
          },
        },
      },
    });

    const dto = this.mapConversationToDto(updated);

    supportEvents.emit({
      type: 'conversation:status',
      conversationId,
      timestamp: new Date().toISOString(),
      payload: {
        status,
        conversation: dto,
      },
    });

    return dto;
  }

  /**
   * Get unread badge counts for navigation
   */
  async getUnreadBadgeCounts(
    userId: string,
    role: Role,
    merchantIdParam?: string
  ): Promise<{ unreadCount: number }> {
    if (role === Role.ADMIN) {
      const result = await prisma.supportConversation.aggregate({
        _sum: { unreadAdminCount: true },
      });
      return { unreadCount: result._sum.unreadAdminCount || 0 };
    }

    if (role === Role.MERCHANT_OWNER || role === Role.MERCHANT_STAFF) {
      try {
        const { merchant } = await merchantService.resolveMerchantAndAuthorize(
          userId,
          merchantIdParam,
          StaffRole.CASHIER
        );
        const result = await prisma.supportConversation.aggregate({
          where: {
            channelType: SupportChannelType.MERCHANT_ADMIN,
            merchantId: merchant.id,
          },
          _sum: { unreadMerchantCount: true },
        });
        return { unreadCount: result._sum.unreadMerchantCount || 0 };
      } catch {
        return { unreadCount: 0 };
      }
    }

    const result = await prisma.supportConversation.aggregate({
      where: {
        channelType: SupportChannelType.CUSTOMER_ADMIN,
        userId,
      },
      _sum: { unreadCustomerCount: true },
    });
    return { unreadCount: result._sum.unreadCustomerCount || 0 };
  }

  private mapConversationToDto(conv: any): SupportConversationDto {
    return {
      id: conv.id,
      channelType: conv.channelType,
      userId: conv.userId,
      merchantId: conv.merchantId,
      subject: conv.subject,
      status: conv.status,
      priority: conv.priority,
      lastMessageAt: conv.lastMessageAt?.toISOString() || null,
      lastMessagePreview: conv.lastMessagePreview,
      unreadCustomerCount: conv.unreadCustomerCount,
      unreadMerchantCount: conv.unreadMerchantCount,
      unreadAdminCount: conv.unreadAdminCount,
      closedAt: conv.closedAt?.toISOString() || null,
      closedByUserId: conv.closedByUserId,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      user: conv.user
        ? {
            id: conv.user.id,
            mobile: conv.user.mobile,
            customer: conv.user.customer ? { fullName: conv.user.customer.fullName } : null,
          }
        : null,
      merchant: conv.merchant
        ? {
            id: conv.merchant.id,
            businessNameFa: conv.merchant.businessNameFa,
            businessType: conv.merchant.businessType,
            bannerImageUrl: conv.merchant.bannerImageUrl,
          }
        : null,
      messages: conv.messages ? conv.messages.map((m: any) => this.mapMessageToDto(m)) : [],
    };
  }

  private mapMessageToDto(message: any): SupportMessageDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderUserId: message.senderUserId,
      senderType: message.senderType,
      clientMessageId: message.clientMessageId,
      body: message.body,
      isRead: message.isRead,
      readAt: message.readAt?.toISOString() || null,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      sender: message.sender
        ? {
            id: message.sender.id,
            mobile: message.sender.mobile,
            fullName: message.sender.customer?.fullName || null,
            role: message.sender.role,
          }
        : null,
      attachments: (message.attachments || []).map((att: any): SupportAttachmentDto => ({
        id: att.id,
        messageId: att.messageId,
        fileName: att.fileName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        fileUrl: `/api/support/attachments/${att.id}`,
        attachmentType: att.attachmentType,
        createdAt: att.createdAt?.toISOString(),
      })),
    };
  }
}

export const supportService = new SupportService();
