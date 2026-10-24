'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  SupportConversationDto,
  SupportMessageDto,
  SupportRealtimeEvent,
} from '@loqme/types';

interface UseSupportChatOptions {
  conversationId: string | null;
  onNewMessage?: (message: SupportMessageDto) => void;
}

export function useSupportChat({ conversationId, onNewMessage }: UseSupportChatOptions) {
  const [conversation, setConversation] = useState<SupportConversationDto | null>(null);
  const [messages, setMessages] = useState<SupportMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  // Fetch full conversation history
  const fetchConversation = useCallback(
    async (showLoading = false) => {
      if (!conversationId) return;
      if (showLoading) setLoading(true);

      try {
        const res = await fetch(`/api/support/conversations/${conversationId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setConversation(json.data);
          setMessages(json.data.messages || []);
          setError(null);
        } else {
          setError(json.message || 'خطا در دریافت اطلاعات گفتگو');
        }
      } catch (err: any) {
        setError(err.message || 'خطا در برقراری ارتباط');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [conversationId]
  );

  // Mark conversation read
  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await fetch(`/api/support/conversations/${conversationId}/read`, {
        method: 'POST',
      });
      // Locally reset unread counts
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              unreadAdminCount: 0,
              unreadCustomerCount: 0,
              unreadMerchantCount: 0,
            }
          : null
      );
    } catch {
      // Ignore background read failures
    }
  }, [conversationId]);

  // Send message with optimistic update and clientMessageId
  const sendMessage = useCallback(
    async (body: string, attachmentIds?: string[]) => {
      if (!conversationId || !body.trim()) return;

      const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const optimisticMessage: SupportMessageDto = {
        id: clientMessageId,
        conversationId,
        senderUserId: 'current_user',
        senderType: 'CUSTOMER', // Temporary for display until confirmed
        clientMessageId,
        body: body.trim(),
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachments: [],
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setSending(true);

      try {
        const res = await fetch(`/api/support/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: body.trim(),
            clientMessageId,
            attachmentIds: attachmentIds && attachmentIds.length > 0 ? attachmentIds : undefined,
          }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          // Replace optimistic message with actual DB record
          setMessages((prev) =>
            prev.map((m) =>
              m.clientMessageId === clientMessageId || m.id === clientMessageId ? json.data : m
            )
          );
          setConversation((prev) =>
            prev
              ? {
                  ...prev,
                  lastMessageAt: json.data.createdAt,
                  lastMessagePreview: json.data.body.slice(0, 150),
                }
              : null
          );
          return json.data;
        } else {
          // Remove failed optimistic message or mark error
          setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
          throw new Error(json.message || 'خطا در ارسال پیام');
        }
      } catch (err: any) {
        setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversationId]
  );

  // Set up SSE and fallback polling
  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    // Initial load
    fetchConversation(true).then(() => {
      markRead();
    });

    let sse: EventSource | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const startPollingFallback = () => {
      if (fallbackTimer) return;
      fallbackTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchConversation(false);
        }
      }, 4000);
      pollIntervalRef.current = fallbackTimer;
    };

    const stopPollingFallback = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
        pollIntervalRef.current = null;
      }
    };

    try {
      sse = new EventSource(`/api/support/conversations/${conversationId}/events`);
      eventSourceRef.current = sse;

      sse.onopen = () => {
        setIsConnected(true);
        stopPollingFallback();
      };

      sse.onmessage = (event) => {
        try {
          const data: SupportRealtimeEvent = JSON.parse(event.data);
          if (data.type === 'message:created' && data.payload?.message) {
            const incoming = data.payload.message;
            setMessages((prev) => {
              // Avoid duplicates (by id or clientMessageId)
              const existingIdx = prev.findIndex(
                (m) =>
                  m.id === incoming.id ||
                  (incoming.clientMessageId && m.clientMessageId === incoming.clientMessageId)
              );
              if (existingIdx !== -1) {
                const next = [...prev];
                next[existingIdx] = incoming;
                return next;
              }
              return [...prev, incoming];
            });

            setConversation((prev) =>
              prev
                ? {
                    ...prev,
                    lastMessageAt: incoming.createdAt,
                    lastMessagePreview: incoming.body.slice(0, 150),
                  }
                : null
            );

            onNewMessageRef.current?.(incoming);
            // Auto mark read if window is active
            if (document.visibilityState === 'visible') {
              markRead();
            }
          } else if (data.type === 'message:read') {
            setMessages((prev) =>
              prev.map((m) =>
                m.isRead ? m : { ...m, isRead: true, readAt: new Date().toISOString() }
              )
            );
          } else if (data.type === 'conversation:status' && data.payload?.status) {
            setConversation((prev) =>
              prev ? { ...prev, status: data.payload.status as any } : null
            );
          }
        } catch {
          // Ignore invalid JSON / heartbeats
        }
      };

      sse.onerror = () => {
        setIsConnected(false);
        // On SSE interruption, start polling fallback immediately
        startPollingFallback();
      };
    } catch {
      setIsConnected(false);
      startPollingFallback();
    }

    return () => {
      if (sse) {
        sse.close();
        eventSourceRef.current = null;
      }
      stopPollingFallback();
    };
  }, [conversationId, fetchConversation, markRead]);

  return {
    conversation,
    messages,
    loading,
    sending,
    error,
    isConnected,
    sendMessage,
    markRead,
    reload: () => fetchConversation(false),
  };
}
