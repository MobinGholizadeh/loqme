import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../apps/web/src/lib/prisma';
import { NotificationService } from '../apps/web/src/domain/notification/notification.service';
import { notificationEvents } from '../apps/web/src/domain/notification/notification-events';
import { webpush } from '../apps/web/src/domain/notification/webpush.config';
import {
  PushSubscriptionSchema,
  NotificationPreferenceSchema,
  MarkNotificationReadSchema,
} from '@loqme/validation';

vi.mock('../apps/web/src/domain/notification/webpush.config', () => ({
  configureWebPush: vi.fn(() => true),
  getVapidKeys: vi.fn(() => ({ publicKey: 'pub', privateKey: 'priv', subject: 'sub' })),
  webpush: {
    sendNotification: vi.fn(),
    setVapidDetails: vi.fn(),
  },
}));

vi.mock('../apps/web/src/lib/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    pushSubscription: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    notificationDelivery: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    merchant: {
      findUnique: vi.fn(),
    },
    merchantStaff: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === 'function') {
        return cb(prisma);
      }
      return Promise.all(cb);
    }),
  },
}));

describe('Notification System & Web Push Engine', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
  });

  describe('Validation Schemas', () => {
    it('validates a correct push subscription payload', () => {
      const validPayload = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/sample-endpoint-token',
        keys: {
          p256dh: 'BKpxG8_sample_p256dh_key_base64_string',
          auth: 'sample_auth_token_base64',
        },
        userAgent: 'Mozilla/5.0 Chrome/120.0',
      };

      const result = PushSubscriptionSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid push subscription missing keys or endpoint', () => {
      const invalidPayload = {
        endpoint: '',
        keys: { p256dh: '' },
      };

      const result = PushSubscriptionSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('validates notification preferences correctly', () => {
      const validPrefs = {
        pushEnabled: true,
        smsOrders: false,
        smsMarketing: true,
        notifyOrders: true,
        notifySystem: true,
        notifySupport: true,
      };

      const result = NotificationPreferenceSchema.safeParse(validPrefs);
      expect(result.success).toBe(true);
    });

    it('validates mark as read schema with individual ID or all flag', () => {
      const markOne = MarkNotificationReadSchema.safeParse({ notificationId: 'notif-123' });
      const markAll = MarkNotificationReadSchema.safeParse({ all: true });

      expect(markOne.success).toBe(true);
      expect(markAll.success).toBe(true);
    });
  });

  describe('Notification Creation and Real-Time Event Dispatch', () => {
    it('creates notification record and dispatches real-time event to event hub', async () => {
      const eventSpy = vi.fn();
      const unsubscribe = notificationEvents.subscribeUser('user-100', eventSpy);

      const fakeNotif = {
        id: 'notif-test-1',
        userId: 'user-100',
        role: 'CUSTOMER',
        type: 'ORDER_CONFIRMED',
        category: 'order',
        title: 'سفارش شما تایید شد',
        body: 'سفارش در نانوایی برکت ثبت گردید',
        link: '/orders/order-1',
        readAt: null,
        isRead: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(fakeNotif as any);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.notificationPreference.create).mockResolvedValueOnce({
        id: 'pref-new',
        userId: 'user-100',
        inAppEnabled: true,
        pushEnabled: true,
        smsOrders: true,
        smsMarketing: false,
        notifyOrders: true,
        notifySupport: true,
        notifyFinance: true,
        notifySystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.notificationDelivery.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.notification.count).mockResolvedValueOnce(1);

      const result = await service.createNotification({
        userId: 'user-100',
        role: 'CUSTOMER',
        type: 'ORDER_CONFIRMED',
        category: 'order',
        title: 'سفارش شما تایید شد',
        body: 'سفارش در نانوایی برکت ثبت گردید',
        link: '/orders/order-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledOnce();
      expect(result.id).toBe('notif-test-1');
      expect(result.title).toBe('سفارش شما تایید شد');
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NOTIFICATION_CREATED',
          userId: 'user-100',
          notification: expect.objectContaining({ id: 'notif-test-1' }),
        })
      );

      unsubscribe();
    });
  });

  describe('Web Push Delivery & Error Handling', () => {
    it('sends web push and records successful delivery when subscription is active', async () => {
      const fakeNotif = {
        id: 'notif-test-2',
        userId: 'user-200',
        role: 'MERCHANT_OWNER',
        type: 'ORDER_RECEIVED',
        category: 'order',
        title: 'سفارش جدید',
        body: 'یک سفارش جدید ثبت شد',
        link: '/merchant/orders',
        readAt: null,
        isRead: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValueOnce([
        {
          id: 'sub-1',
          userId: 'user-200',
          endpoint: 'https://fcm.googleapis.com/fcm/send/active-sub-1',
          p256dh: 'sample-p256dh',
          auth: 'sample-auth',
          userAgent: 'Chrome',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(webpush.sendNotification).mockResolvedValueOnce({ statusCode: 201 } as any);
      vi.mocked(prisma.notificationDelivery.create).mockResolvedValueOnce({} as any);

      await service.dispatchWebPushToUser('user-200', fakeNotif as any);

      expect(webpush.sendNotification).toHaveBeenCalledOnce();
      expect(prisma.notificationDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notificationId: 'notif-test-2',
          channel: 'WEB_PUSH',
          status: 'SENT',
        }),
      });
    });

    it('deactivates expired push subscription on 410 Gone error and logs delivery failure', async () => {
      const fakeNotif = {
        id: 'notif-test-3',
        userId: 'user-300',
        role: 'CUSTOMER',
        type: 'SUPPORT_REPLY',
        category: 'support',
        title: 'پاسخ پشتیبانی',
        body: 'پاسخ شما ارسال شد',
        link: '/profile/support',
        readAt: null,
        isRead: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValueOnce([
        {
          id: 'sub-expired-1',
          userId: 'user-300',
          endpoint: 'https://fcm.googleapis.com/fcm/send/expired-sub',
          p256dh: 'sample-p256dh',
          auth: 'sample-auth',
          userAgent: 'Chrome',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const goneError: any = new Error('Subscription expired');
      goneError.statusCode = 410;
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(goneError);
      vi.mocked(prisma.pushSubscription.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.notificationDelivery.create).mockResolvedValueOnce({} as any);

      await service.dispatchWebPushToUser('user-300', fakeNotif as any);

      expect(prisma.pushSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-expired-1' },
        data: { isActive: false },
      });
      expect(prisma.notificationDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notificationId: 'notif-test-3',
          channel: 'WEB_PUSH',
          status: 'FAILED',
          errorMessage: expect.stringContaining('Subscription expired'),
        }),
      });
    });

    it('respects user preferences when push notifications are disabled', async () => {
      const fakeNotif = {
        id: 'notif-test-4',
        userId: 'user-400',
        role: 'CUSTOMER',
        type: 'ORDER_CONFIRMED',
        category: 'order',
        title: 'سفارش تایید شد',
        body: 'توضیحات سفارش',
        link: '/orders',
        readAt: null,
        isRead: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValueOnce(fakeNotif as any);
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce({
        id: 'pref-3',
        userId: 'user-400',
        inAppEnabled: true,
        pushEnabled: false, // Disabled!
        notifyOrders: true,
        smsOrders: true,
        smsMarketing: true,
        notifyFinance: true,
        notifySystem: true,
        notifySupport: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.notificationDelivery.create).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.notification.count).mockResolvedValueOnce(1);

      const dispatchSpy = vi.spyOn(service, 'dispatchWebPushToUser');

      await service.createNotification({
        userId: 'user-400',
        role: 'CUSTOMER',
        type: 'ORDER_CONFIRMED',
        category: 'order',
        title: 'سفارش تایید شد',
        body: 'توضیحات سفارش',
        link: '/orders',
      });

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Role-Based Notification Broadcasting', () => {
    it('notifies all active administrators via notifyAdmins', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
        { id: 'admin-1', role: 'ADMIN' },
        { id: 'admin-2', role: 'ADMIN' },
      ] as any);

      const createSpy = vi.spyOn(service, 'createNotification').mockResolvedValue({} as any);

      await service.notifyAdmins({
        type: 'BANK_ACCOUNT_PENDING',
        category: 'system',
        title: 'حساب بانکی در انتظار تایید',
        body: 'فروشگاه جدید شبا ثبت کرد',
        link: '/admin/finance',
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          role: 'ADMIN',
        })
      );
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-2',
          role: 'ADMIN',
        })
      );
    });

    it('notifies merchant owner and staff members via notifyMerchant', async () => {
      vi.mocked(prisma.merchant.findUnique).mockResolvedValueOnce({
        id: 'merch-1',
        ownerUserId: 'owner-user-1',
        staff: [{ userId: 'staff-user-1' }],
      } as any);

      const createSpy = vi.spyOn(service, 'createNotification').mockResolvedValue({} as any);

      await service.notifyMerchant('merch-1', {
        type: 'ORDER_RECEIVED',
        category: 'order',
        title: 'سفارش جدید دریافت شد',
        body: 'سفارش #100 ثبت گردید',
        link: '/merchant/orders',
      });

      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner-user-1',
          role: 'MERCHANT_OWNER',
        })
      );
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'staff-user-1',
          role: 'MERCHANT_OWNER',
        })
      );
    });
  });

  describe('Read Status Transitions & Unread Counts', () => {
    it('marks a single notification as read and updates unread badge', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValueOnce({ count: 1 });
      vi.mocked(prisma.notification.count).mockResolvedValueOnce(3);

      const eventSpy = vi.fn();
      const unsubscribe = notificationEvents.subscribeUser('user-500', eventSpy);

      const result = await service.markAsRead('user-500', 'notif-999');

      expect(result.updatedCount).toBe(1);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-999', userId: 'user-500', isRead: false },
        data: expect.objectContaining({ isRead: true }),
      });
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NOTIFICATION_READ',
          unreadCount: 3,
        })
      );

      unsubscribe();
    });

    it('marks all notifications as read when notificationId is omitted', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValueOnce({ count: 5 });

      const eventSpy = vi.fn();
      const unsubscribe = notificationEvents.subscribeUser('user-600', eventSpy);

      const result = await service.markAsRead('user-600');

      expect(result.updatedCount).toBe(5);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-600', isRead: false },
        data: expect.objectContaining({ isRead: true }),
      });
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NOTIFICATION_READ',
          unreadCount: 0,
        })
      );

      unsubscribe();
    });
  });

  describe('Push Subscription Management', () => {
    it('upserts push subscription and sets isActive: true', async () => {
      vi.mocked(prisma.pushSubscription.upsert).mockResolvedValueOnce({} as any);

      const res = await service.savePushSubscription('user-700', {
        endpoint: 'https://endpoint.example.com',
        keys: { p256dh: 'p256dh', auth: 'auth' },
        userAgent: 'Firefox',
      });

      expect(res).toBe(true);
      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith({
        where: { endpoint: 'https://endpoint.example.com' },
        update: {
          userId: 'user-700',
          p256dh: 'p256dh',
          auth: 'auth',
          userAgent: 'Firefox',
          isActive: true,
        },
        create: {
          userId: 'user-700',
          endpoint: 'https://endpoint.example.com',
          p256dh: 'p256dh',
          auth: 'auth',
          userAgent: 'Firefox',
          isActive: true,
        },
      });
    });

    it('deactivates subscription on unsubscribe', async () => {
      vi.mocked(prisma.pushSubscription.updateMany).mockResolvedValueOnce({ count: 1 });

      await service.removePushSubscription('user-700', 'https://endpoint.example.com');

      expect(prisma.pushSubscription.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-700', endpoint: 'https://endpoint.example.com' },
        data: { isActive: false },
      });
    });
  });
});
