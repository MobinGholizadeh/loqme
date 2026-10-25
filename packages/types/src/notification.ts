/**
 * @loqme/types — Notification and Web Push Types
 */

export type NotificationCategory = 'order' | 'discount' | 'system' | 'support';
export type NotificationChannel = 'IN_APP' | 'WEB_PUSH' | 'SMS';
export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface NotificationDto {
  id: string;
  userId: string;
  role: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  link?: string | null;
  dataJson?: string | null;
  isRead: boolean;
  readAt?: string | null;
  time?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferenceDto {
  id: string;
  userId: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  smsOrders: boolean;
  smsMarketing: boolean;
  notifyOrders: boolean;
  notifySupport: boolean;
  notifyFinance: boolean;
  notifySystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface WebPushPayload {
  id?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  link?: string;
  tag?: string;
  category?: string;
  data?: Record<string, unknown>;
}

export interface NotificationRealtimeEvent {
  type: 'NOTIFICATION_CREATED' | 'NOTIFICATION_READ' | 'UNREAD_COUNT_CHANGED';
  userId: string;
  notification?: NotificationDto;
  unreadCount: number;
  timestamp: string;
}

export interface NotificationListResponse {
  notifications: NotificationDto[];
  total: number;
  unreadCount: number;
  unreadByCategory: Record<NotificationCategory, number>;
}
