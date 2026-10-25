import { withDatabaseService } from '@/lib/db/context';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationDto,
  NotificationPreferenceDto,
  PushSubscriptionInput,
  WebPushPayload,
} from '@loqme/types';
import { toPersianDigits } from '@loqme/validation';
import { configureWebPush, webpush } from './webpush.config';
import { notificationEvents } from './notification-events';
import { getNotificationService } from '@/lib/notifications';

export interface CreateNotificationInput {
  userId: string;
  role?: Role;
  type: string;
  category?: NotificationCategory;
  title: string;
  body: string;
  link?: string | null;
  dataJson?: string | null;
  channels?: NotificationChannel[];
  smsRecipientMobile?: string;
  smsType?: 'ORDER_CONFIRMATION' | 'PICKUP_REMINDER';
  smsData?: {
    orderNumber?: string;
    pickupWindow?: string;
    remainingMinutes?: number;
  };
}

export interface GetNotificationsQuery {
  category?: string;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

function toRelativeTime(date: Date | string): string {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) return 'هم‌اکنون';
  if (diffMinutes < 60) return `${toPersianDigits(diffMinutes)} دقیقه پیش`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${toPersianDigits(diffHours)} ساعت پیش`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${toPersianDigits(diffDays)} روز پیش`;
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(new Date(date));
}

function formatNotification(n: any): NotificationDto {
  return {
    id: n.id,
    userId: n.userId,
    role: n.role,
    type: n.type,
    category: n.category as NotificationCategory,
    title: n.title,
    body: n.body,
    link: n.link,
    dataJson: n.dataJson,
    isRead: n.isRead,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    time: toRelativeTime(n.createdAt),
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

export class NotificationService {
  /**
   * Creates a notification, dispatches to requested channels (In-App, Web Push, SMS),
   * records delivery outcomes, and notifies real-time listeners.
   */
  async createNotification(input: CreateNotificationInput): Promise<NotificationDto> {
    return withDatabaseService('notification', input.userId, async () => {
      const role = input.role || Role.CUSTOMER;
    const category = input.category || 'system';
    const channels = input.channels || ['IN_APP', 'WEB_PUSH'];

    // 1. Fetch or create recipient preferences
    const preferences = await this.getPreferences(input.userId);

    // 2. Check category preferences
    if (category === 'order' && !preferences.notifyOrders) {
      channels.length = 0; // Skip channels if user opted out of orders
    } else if (category === 'support' && !preferences.notifySupport) {
      channels.length = 0;
    } else if (category === 'system' && !preferences.notifySystem) {
      channels.length = 0;
    }

    // 3. Insert notification record into database
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        role,
        type: input.type,
        category,
        title: input.title,
        body: input.body,
        link: input.link || null,
        dataJson: input.dataJson || null,
        isRead: false,
      },
    });

    // 4. In-App Delivery logging
    if (channels.includes('IN_APP') && preferences.inAppEnabled) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: 'IN_APP',
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    }

    // 5. Web Push delivery
    if (channels.includes('WEB_PUSH') && preferences.pushEnabled) {
      this.dispatchWebPushToUser(input.userId, {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        link: notification.link || undefined,
        category: notification.category,
      }).catch((err) => {
        console.error(`[NotificationService] WebPush dispatch error for user ${input.userId}:`, err);
      });
    }

    // 6. SMS delivery
    if (channels.includes('SMS') && preferences.smsOrders && input.smsRecipientMobile) {
      this.dispatchSms(notification.id, input.smsRecipientMobile, input.smsType, input.smsData).catch(
        (err) => {
          console.error(`[NotificationService] SMS dispatch error for ${input.smsRecipientMobile}:`, err);
        }
      );
    }

    // 7. Real-time in-app notification count & push broadcast
    const unreadCount = await prisma.notification.count({
      where: { userId: input.userId, isRead: false },
    });

    const dto = formatNotification(notification);

    notificationEvents.emit({
      type: 'NOTIFICATION_CREATED',
      userId: input.userId,
      notification: dto,
      unreadCount,
      timestamp: new Date().toISOString(),
    });

    return dto;
    });
  }

  /**
   * Dispatches web push notification to all active devices of a user
   */
  async dispatchWebPushToUser(userId: string, payload: WebPushPayload): Promise<void> {
    return withDatabaseService('notification', userId, async () => {
      configureWebPush();

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
      id: payload.id,
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon.svg',
      badge: payload.badge || '/favicon.svg',
      link: payload.link || '/',
      tag: payload.tag || (payload.id ? `loqme-${payload.id}` : undefined),
      category: payload.category || 'system',
      data: payload.data || {},
    });

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload,
            {
              TTL: 86400, // 24 hours
              urgency: 'high',
            }
          );

          if (payload.id) {
            await prisma.notificationDelivery.create({
              data: {
                notificationId: payload.id,
                channel: 'WEB_PUSH',
                status: 'SENT',
                sentAt: new Date(),
              },
            });
          }
        } catch (error: any) {
          const statusCode = error?.statusCode;
          // 404 or 410 indicates the push subscription has expired or was revoked by the user
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { isActive: false },
            });
          }

          if (payload.id) {
            await prisma.notificationDelivery.create({
              data: {
                notificationId: payload.id,
                channel: 'WEB_PUSH',
                status: 'FAILED',
                errorMessage: error?.message || 'Push delivery failed',
              },
            });
          }
        }
      })
    );
    });
  }

  /**
   * Dispatches SMS message using notification provider
   */
  private async dispatchSms(
    notificationId: string,
    mobile: string,
    smsType?: 'ORDER_CONFIRMATION' | 'PICKUP_REMINDER',
    smsData?: { orderNumber?: string; pickupWindow?: string; remainingMinutes?: number }
  ): Promise<void> {
    const sms = getNotificationService();
    let sent = false;

    try {
      if (smsType === 'ORDER_CONFIRMATION' && smsData?.orderNumber && smsData?.pickupWindow) {
        sent = await sms.sendOrderConfirmation(mobile, smsData.orderNumber, smsData.pickupWindow);
      } else if (smsType === 'PICKUP_REMINDER' && smsData?.orderNumber && smsData?.remainingMinutes) {
        sent = await sms.sendPickupReminder(mobile, smsData.orderNumber, smsData.remainingMinutes);
      }

      await prisma.notificationDelivery.create({
        data: {
          notificationId,
          channel: 'SMS',
          status: sent ? 'SENT' : 'FAILED',
          sentAt: sent ? new Date() : null,
          errorMessage: sent ? null : 'SMS provider dispatch rejected',
        },
      });
    } catch (err: any) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId,
          channel: 'SMS',
          status: 'FAILED',
          errorMessage: err?.message || 'SMS error',
        },
      });
    }
  }

  /**
   * Broadcasts notification to all system administrators
   */
  async notifyAdmins(params: Omit<CreateNotificationInput, 'userId' | 'role'>): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.createNotification({
          ...params,
          userId: admin.id,
          role: Role.ADMIN,
        })
      )
    );
  }

  /**
   * Broadcasts notification to merchant owner and active staff members
   */
  async notifyMerchant(
    merchantId: string,
    params: Omit<CreateNotificationInput, 'userId' | 'role'>
  ): Promise<void> {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        ownerUserId: true,
        staff: {
          select: { userId: true },
        },
      },
    });

    if (!merchant) return;

    const targetUserIds = Array.from(
      new Set([merchant.ownerUserId, ...merchant.staff.map((s) => s.userId)])
    );

    await Promise.all(
      targetUserIds.map((userId) =>
        this.createNotification({
          ...params,
          userId,
          role: Role.MERCHANT_OWNER,
        })
      )
    );
  }

  /**
   * Gets paginated notifications for a user with category unread counts
   */
  async getNotifications(
    userId: string,
    query: GetNotificationsQuery = {}
  ): Promise<{
    notifications: NotificationDto[];
    total: number;
    unreadCount: number;
    unreadByCategory: Record<NotificationCategory, number>;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (query.category && query.category !== 'all') {
      where.category = query.category;
    }

    if (typeof query.isRead === 'boolean') {
      where.isRead = query.isRead;
    }

    const [items, total, unreadCount, unreadOrders, unreadDiscounts, unreadSystem, unreadSupport] =
      await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.notification.count({ where: { userId, isRead: false, category: 'order' } }),
        prisma.notification.count({ where: { userId, isRead: false, category: 'discount' } }),
        prisma.notification.count({ where: { userId, isRead: false, category: 'system' } }),
        prisma.notification.count({ where: { userId, isRead: false, category: 'support' } }),
      ]);

    return {
      notifications: items.map(formatNotification),
      total,
      unreadCount,
      unreadByCategory: {
        order: unreadOrders,
        discount: unreadDiscounts,
        system: unreadSystem,
        support: unreadSupport,
      },
    };
  }

  /**
   * Marks a single notification or all notifications of a user as read
   */
  async markAsRead(userId: string, notificationId?: string): Promise<{ success: boolean; updatedCount: number }> {
    const now = new Date();

    if (notificationId && notificationId !== 'all') {
      const result = await prisma.notification.updateMany({
        where: { id: notificationId, userId, isRead: false },
        data: { isRead: true, readAt: now },
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      notificationEvents.emit({
        type: 'NOTIFICATION_READ',
        userId,
        unreadCount,
        timestamp: now.toISOString(),
      });

      return { success: true, updatedCount: result.count };
    }

    // Mark all as read
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: now },
    });

    notificationEvents.emit({
      type: 'NOTIFICATION_READ',
      userId,
      unreadCount: 0,
      timestamp: now.toISOString(),
    });

    return { success: true, updatedCount: result.count };
  }

  /**
   * Gets unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Saves or updates a Web Push subscription
   */
  async savePushSubscription(userId: string, input: PushSubscriptionInput): Promise<boolean> {
    await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent || null,
        isActive: true,
      },
      update: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: input.userAgent || null,
        isActive: true,
      },
    });

    return true;
  }

  /**
   * Removes or deactivates a Web Push subscription
   */
  async removePushSubscription(userId: string, endpoint: string): Promise<boolean> {
    await prisma.pushSubscription.updateMany({
      where: { userId, endpoint },
      data: { isActive: false },
    });

    return true;
  }

  /**
   * Retrieves or initializes notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferenceDto> {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      return {
        id: 'default-' + userId,
        userId,
        inAppEnabled: true,
        pushEnabled: true,
        smsOrders: true,
        smsMarketing: false,
        notifyOrders: true,
        notifySupport: true,
        notifyFinance: true,
        notifySystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: pref.id,
      userId: pref.userId,
      inAppEnabled: pref.inAppEnabled,
      pushEnabled: pref.pushEnabled,
      smsOrders: pref.smsOrders,
      smsMarketing: pref.smsMarketing,
      notifyOrders: pref.notifyOrders,
      notifySupport: pref.notifySupport,
      notifyFinance: pref.notifyFinance,
      notifySystem: pref.notifySystem,
      createdAt: pref.createdAt.toISOString(),
      updatedAt: pref.updatedAt.toISOString(),
    };
  }

  /**
   * Updates notification preferences
   */
  async updatePreferences(
    userId: string,
    data: Partial<Omit<NotificationPreferenceDto, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationPreferenceDto> {
    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        inAppEnabled: data.inAppEnabled ?? true,
        pushEnabled: data.pushEnabled ?? true,
        smsOrders: data.smsOrders ?? true,
        smsMarketing: data.smsMarketing ?? false,
        notifyOrders: data.notifyOrders ?? true,
        notifySupport: data.notifySupport ?? true,
        notifyFinance: data.notifyFinance ?? true,
        notifySystem: data.notifySystem ?? true,
      },
      update: {
        ...(typeof data.inAppEnabled === 'boolean' ? { inAppEnabled: data.inAppEnabled } : {}),
        ...(typeof data.pushEnabled === 'boolean' ? { pushEnabled: data.pushEnabled } : {}),
        ...(typeof data.smsOrders === 'boolean' ? { smsOrders: data.smsOrders } : {}),
        ...(typeof data.smsMarketing === 'boolean' ? { smsMarketing: data.smsMarketing } : {}),
        ...(typeof data.notifyOrders === 'boolean' ? { notifyOrders: data.notifyOrders } : {}),
        ...(typeof data.notifySupport === 'boolean' ? { notifySupport: data.notifySupport } : {}),
        ...(typeof data.notifyFinance === 'boolean' ? { notifyFinance: data.notifyFinance } : {}),
        ...(typeof data.notifySystem === 'boolean' ? { notifySystem: data.notifySystem } : {}),
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      inAppEnabled: updated.inAppEnabled,
      pushEnabled: updated.pushEnabled,
      smsOrders: updated.smsOrders,
      smsMarketing: updated.smsMarketing,
      notifyOrders: updated.notifyOrders,
      notifySupport: updated.notifySupport,
      notifyFinance: updated.notifyFinance,
      notifySystem: updated.notifySystem,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

export const notificationService = new NotificationService();
