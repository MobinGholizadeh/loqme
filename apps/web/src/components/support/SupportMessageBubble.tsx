'use client';

import React from 'react';
import type { SupportMessageDto } from '@loqme/types';
import { formatPersianTime, formatFileSize } from './support-format';
import { Check, CheckCheck, Clock, FileText, Download, ShieldCheck, Store, User } from 'lucide-react';

interface SupportMessageBubbleProps {
  message: SupportMessageDto;
  isOwn: boolean;
  onImageClick?: (url: string) => void;
}

export function SupportMessageBubble({
  message,
  isOwn,
  onImageClick,
}: SupportMessageBubbleProps) {
  const isOptimistic = message.id.startsWith('msg_');
  const isImageAttachment = (mime: string) => mime.startsWith('image/');

  return (
    <div
      className={`flex flex-col mb-3.5 max-w-[85%] sm:max-w-[75%] ${
        isOwn ? 'mr-auto items-start' : 'ml-auto items-end'
      }`}
    >
      {/* Sender Header for counterparty messages */}
      {!isOwn && (
        <div className="flex items-center gap-1.5 mb-1 px-1 text-xs font-medium text-slate-600">
          {message.senderType === 'ADMIN' ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-[#1D616A]" />
              <span className="text-[#1D616A] font-semibold">پشتیبانی لقمه</span>
            </>
          ) : message.senderType === 'MERCHANT' ? (
            <>
              <Store className="w-3.5 h-3.5 text-amber-700" />
              <span>{message.sender?.fullName || 'فروشگاه'}</span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span>{message.sender?.fullName || 'کاربر'}</span>
            </>
          )}
        </div>
      )}

      {/* Bubble Box */}
      <div
        className={`relative rounded-2xl px-4 py-2.5 shadow-sm text-sm transition-all duration-150 ${
          isOwn
            ? 'bg-[#1D616A] text-white rounded-tr-none'
            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
        }`}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-col gap-2 mb-2">
            {message.attachments.map((att) => {
              const isImg = isImageAttachment(att.mimeType);
              if (isImg) {
                return (
                  <div
                    key={att.id}
                    className="relative rounded-lg overflow-hidden border border-black/10 cursor-pointer group bg-black/5 max-w-sm"
                    onClick={() => onImageClick?.(att.fileUrl)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.fileUrl}
                      alt={att.fileName}
                      className="max-h-60 w-auto object-cover rounded-lg group-hover:scale-[1.02] transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                );
              }

              return (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                    isOwn
                      ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div
                    className={`p-2 rounded-md ${
                      isOwn ? 'bg-white/20 text-white' : 'bg-[#1D616A]/10 text-[#1D616A]'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" dir="ltr">
                      {att.fileName}
                    </p>
                    <p className="text-[11px] opacity-75">{formatFileSize(att.fileSize)}</p>
                  </div>
                  <Download className="w-4 h-4 opacity-75 hover:opacity-100" />
                </a>
              );
            })}
          </div>
        )}

        {/* Text Body */}
        {message.body && (
          <p className="whitespace-pre-wrap break-words leading-relaxed select-text font-normal">
            {message.body}
          </p>
        )}

        {/* Timestamp and Delivery ticks */}
        <div
          className={`flex items-center gap-1.5 mt-1 select-none text-[10px] ${
            isOwn ? 'text-teal-100 justify-start' : 'text-slate-400 justify-end'
          }`}
        >
          <span>{formatPersianTime(message.createdAt)}</span>
          {isOwn && (
            <span className="flex items-center">
              {isOptimistic ? (
                <Clock className="w-3 h-3 animate-spin text-teal-200" />
              ) : message.isRead ? (
                <span title="خوانده شد">
                  <CheckCheck className="w-3.5 h-3.5 text-teal-200" />
                </span>
              ) : (
                <span title="ارسال شد">
                  <Check className="w-3.5 h-3.5 text-teal-300" />
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
