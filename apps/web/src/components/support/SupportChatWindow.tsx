'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSupportChat } from './useSupportChat';
import { SupportMessageBubble } from './SupportMessageBubble';
import { SupportMessageInput } from './SupportMessageInput';
import { formatPersianDate } from './support-format';
import {
  ArrowRight,
  ShieldCheck,
  Store,
  User,
  Radio,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { SupportConversationStatus } from '@loqme/types';

interface SupportChatWindowProps {
  conversationId: string | null;
  currentUserId: string;
  userRole: string;
  onBackToList?: () => void;
}

export function SupportChatWindow({
  conversationId,
  currentUserId,
  userRole,
  onBackToList,
}: SupportChatWindowProps) {
  const {
    conversation,
    messages,
    loading,
    error,
    isConnected,
    sendMessage,
    markRead,
  } = useSupportChat({ conversationId });

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = userRole === 'ADMIN';

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark read when user focuses window
  useEffect(() => {
    const handleFocus = () => {
      markRead();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [markRead]);

  // Admin status update handler
  const handleStatusChange = async (newStatus: SupportConversationStatus) => {
    if (!conversationId || !isAdmin) return;
    setUpdatingStatus(true);
    try {
      await fetch(`/api/support/conversations/${conversationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/40">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#1D616A] flex items-center justify-center mb-3">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">
          گفتگوی مورد نظر را انتخاب کنید
        </h3>
        <p className="text-xs text-slate-500 max-w-xs">
          از لیست سمت راست یک گفتگو را انتخاب کنید تا تاریخچه پیام‌ها و امکان پاسخ نمایش داده شود
        </p>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50/40">
        <Clock className="w-6 h-6 animate-spin text-[#1D616A] mb-2" />
        <p className="text-xs">در حال بارگذاری گفتگو</p>
      </div>
    );
  }

  const isMerchantChannel = conversation?.channelType === 'MERCHANT_ADMIN';
  const partnerName = isMerchantChannel
    ? conversation?.merchant?.businessNameFa || 'فروشگاه'
    : conversation?.user?.customer?.fullName || conversation?.user?.mobile || 'کاربر لقمه';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFBFB] relative overflow-hidden">
      {/* Chat Header */}
      <div className="bg-white border-b border-slate-200/90 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="بازگشت به لیست"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isMerchantChannel
                ? 'bg-amber-100 text-amber-800'
                : 'bg-teal-100 text-[#1D616A]'
            }`}
          >
            {isMerchantChannel ? (
              <Store className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-slate-800">{partnerName}</h2>
              {conversation?.user?.mobile && isAdmin && (
                <span className="text-[11px] text-slate-400" dir="ltr">
                  {conversation.user.mobile}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="truncate max-w-[200px] sm:max-w-xs">
                {conversation?.subject || 'پشتیبانی'}
              </span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
              <div className="flex items-center gap-1">
                <Radio
                  className={`w-3 h-3 ${
                    isConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'
                  }`}
                />
                <span className="text-[10px]">
                  {isConnected ? 'اتصال زنده' : 'به‌روزرسانی خودکار'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right header actions */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <select
              value={conversation?.status || 'OPEN'}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              disabled={updatingStatus}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border focus:outline-none transition-colors ${
                conversation?.status === 'OPEN'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : conversation?.status === 'RESOLVED'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <option value="OPEN">🟢 وضعیت: باز</option>
              <option value="RESOLVED">🔵 وضعیت: حل‌شده</option>
              <option value="CLOSED">⚪ وضعیت: بسته</option>
            </select>
          ) : (
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                conversation?.status === 'OPEN'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : conversation?.status === 'RESOLVED'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {conversation?.status === 'OPEN'
                ? 'پاسخگویی فعال'
                : conversation?.status === 'RESOLVED'
                ? 'حل‌شده'
                : 'بسته شده'}
            </span>
          )}
        </div>
      </div>

      {/* Message History Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Welcome Header in chat */}
        <div className="text-center py-6 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-[#1D616A] mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-semibold text-slate-800">
            کانال گفتگوی رسمی با پشتیبانی لقمه
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
            پیام‌های شما توسط تیم پشتیبانی بررسی و در سریع‌ترین زمان ممکن پاسخ داده می‌شوند
          </p>
          <div className="mt-3 inline-block bg-slate-200/60 text-slate-600 text-[10px] px-3 py-1 rounded-full">
            {formatPersianDate(conversation?.createdAt)}
          </div>
        </div>

        {/* Message List */}
        {messages.map((msg) => {
          const isOwn = msg.senderUserId === currentUserId;
          return (
            <SupportMessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              onImageClick={(url) => setLightboxImage(url)}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Resolved Warning if conversation is closed */}
      {conversation?.status === 'CLOSED' && (
        <div className="bg-slate-100/90 border-t border-slate-200 px-4 py-2.5 text-center text-xs text-slate-600 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-slate-500" />
          <span>این گفتگو توسط پشتیبانی به عنوان خاتمه‌یافته علامت‌گذاری شده است؛ با ارسال پیام جدید، گفتگو مجدداً فعال می‌شود</span>
        </div>
      )}

      {/* Message Input */}
      <SupportMessageInput
        onSendMessage={sendMessage}
        disabled={false}
        placeholder={
          conversation?.status === 'CLOSED'
            ? 'برای شروع مجدد پیام بفرستید'
            : 'پیام خود را بنویسید'
        }
      />

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            aria-label="بستن"
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="پیش‌نمایش تصویر"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
