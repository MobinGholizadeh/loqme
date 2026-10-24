export type SupportChannelType = 'CUSTOMER_ADMIN' | 'MERCHANT_ADMIN';

export type SupportConversationStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';

export type SupportPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type SupportMessageSenderType = 'ADMIN' | 'MERCHANT' | 'CUSTOMER' | 'SYSTEM';

export type SupportAttachmentType = 'IMAGE' | 'DOCUMENT' | 'OTHER';

export interface SupportAttachmentDto {
  id: string;
  messageId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  attachmentType: SupportAttachmentType;
  createdAt?: string;
}

export interface SupportSenderSummaryDto {
  id: string;
  mobile: string;
  fullName?: string | null;
  role: string;
}

export interface SupportMessageDto {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderType: SupportMessageSenderType;
  clientMessageId?: string | null;
  body: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: SupportSenderSummaryDto | null;
  attachments: SupportAttachmentDto[];
}

export interface SupportConversationDto {
  id: string;
  channelType: SupportChannelType;
  userId?: string | null;
  merchantId?: string | null;
  subject?: string | null;
  status: SupportConversationStatus;
  priority: SupportPriority;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCustomerCount: number;
  unreadMerchantCount: number;
  unreadAdminCount: number;
  closedAt?: string | null;
  closedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    mobile: string;
    customer?: {
      fullName?: string | null;
    } | null;
  } | null;
  merchant?: {
    id: string;
    businessNameFa: string;
    businessType: string;
    bannerImageUrl?: string | null;
  } | null;
  messages?: SupportMessageDto[];
}

export interface SupportConversationSummaryDto {
  id: string;
  channelType: SupportChannelType;
  userId?: string | null;
  merchantId?: string | null;
  subject?: string | null;
  status: SupportConversationStatus;
  priority: SupportPriority;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
}

export interface SendSupportMessageInput {
  conversationId: string;
  body: string;
  clientMessageId?: string;
  attachmentIds?: string[];
}

export interface CreateSupportConversationInput {
  channelType: SupportChannelType;
  merchantId?: string;
  subject?: string;
  initialMessage?: string;
  attachmentIds?: string[];
}

export interface SupportConversationFilterInput {
  status?: SupportConversationStatus | 'ALL';
  channelType?: SupportChannelType | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}

export type SupportRealtimeEventType =
  | 'message:created'
  | 'message:read'
  | 'conversation:updated'
  | 'conversation:status';

export interface SupportRealtimeEvent {
  type: SupportRealtimeEventType;
  conversationId: string;
  timestamp: string;
  payload: {
    message?: SupportMessageDto;
    conversation?: SupportConversationDto | SupportConversationSummaryDto;
    readByUserId?: string;
    status?: SupportConversationStatus;
    [key: string]: unknown;
  };
}
