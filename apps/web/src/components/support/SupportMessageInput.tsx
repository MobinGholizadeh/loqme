'use client';

import styles from './support-workspace.module.css';
import React, { useState, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import type { SupportAttachmentDto } from '@loqme/types';
import { formatFileSize } from './support-format';

interface SupportMessageInputProps {
  onSendMessage: (body: string, attachmentIds?: string[]) => Promise<any>;
  disabled?: boolean;
  placeholder?: string;
}

export function SupportMessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'پیام خود را بنویسید',
}: SupportMessageInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<SupportAttachmentDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (attachments.length >= 5) {
      setUploadError('حداکثر ۵ فایل در هر پیام مجاز است');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/support/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAttachments((prev) => [...prev, json.data]);
      } else {
        setUploadError(json.message || 'خطا در بارگذاری فایل');
      }
    } catch {
      setUploadError('ارتباط با سرور برای بارگذاری فایل برقرار نشد');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || disabled || uploading) {
      return;
    }

    const currentText = trimmed || (attachments.length > 0 ? '📎 فایل پیوست' : '');
    const currentAttachmentIds = attachments.map((a) => a.id);

    setText('');
    setAttachments([]);
    setUploadError(null);

    try {
      await onSendMessage(currentText, currentAttachmentIds);
    } catch {
      // Revert if send failed
      setText(currentText);
      setUploadError('ارسال پیام با خطا مواجه شد؛ لطفاً دوباره تلاش کنید');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.composer}>
      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Tray */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5 pb-2 border-b border-slate-100">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
            >
              {att.attachmentType === 'IMAGE' ? (
                <ImageIcon className="w-3.5 h-3.5 text-[#1D616A]" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span className="font-medium text-slate-700 max-w-[130px] truncate" dir="ltr">
                {att.fileName}
              </span>
              <span className="text-[10px] text-slate-400">({formatFileSize(att.fileSize)})</span>
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="text-slate-400 hover:text-red-600 transition-colors mr-1"
                aria-label="حذف فایل"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className={styles.composerRow}>
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
          className="hidden"
          disabled={disabled || uploading}
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-[#1D616A] hover:bg-slate-50 hover:border-[#1D616A]/40 transition-all disabled:opacity-50 disabled:pointer-events-none"
          title="افزودن عکس یا سند"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#1D616A]" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        {/* Text Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'این گفتگو بسته شده است' : placeholder}
            disabled={disabled}
            aria-label="متن پیام"
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#1D616A] focus:outline-none focus:ring-2 focus:ring-[#1D616A]/10 transition-all max-h-32 min-h-[42px] leading-relaxed"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || uploading || (!text.trim() && attachments.length === 0)}
          className={styles.sendButton}
          title="ارسال پیام"
        >
          <Send className="w-5 h-5 transform -rotate-90 rtl:rotate-90" />
        </button>
      </div>
    </div>
  );
}
