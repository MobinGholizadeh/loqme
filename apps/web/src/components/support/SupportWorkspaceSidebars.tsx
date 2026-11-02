'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Headphones, MessageCircle, ShieldCheck, FolderOpen, FileText, ImageIcon, ArrowUpLeft, X, Store, User } from 'lucide-react';
import type { SupportConversationDto, SupportMessageDto } from '@loqme/types';
import { formatFileSize } from './support-format';
import styles from './support-workspace.module.css';

interface Props {
  panel: 'navigation' | 'files';
  conversation: SupportConversationDto | null;
  messages: SupportMessageDto[];
  merchant: boolean;
  expanded?: boolean;
  onClose?: () => void;
}

export function SupportWorkspaceSidebars({ panel, conversation, messages, merchant, expanded, onClose }: Props) {
  const [filter, setFilter] = useState<'all' | 'IMAGE' | 'DOCUMENT'>('all');
  const attachments = Array.from(new Map(messages.flatMap(message => message.attachments || []).map(file => [file.id, file])).values());
  const files = attachments.filter(file => filter === 'all' || file.attachmentType === filter);
  const count = (value: number) => value.toLocaleString('fa-IR');
  const name = merchant ? conversation?.merchant?.businessNameFa || 'فروشگاه شما' : conversation?.user?.customer?.fullName || 'حساب شما';

  if (panel === 'navigation') return (
    <aside className={styles.navigation} aria-label="مرکز پشتیبانی">
      <div className={styles.panelHeading}><MessageCircle size={19} /><h1>پیام‌ها</h1></div>
      <div className={styles.profile}>
        <div className={styles.profileAvatar}>{merchant ? <Store size={29} /> : <User size={29} />}</div>
        <strong>{name}</strong>
        <span>{merchant ? 'پشتیبانی فروشگاه' : 'پشتیبانی خریداران'}</span>
      </div>
      <p className={styles.eyebrow}>گفتگوی شما</p>
      <div className={styles.selectedConversation} aria-current="true">
        <div className={styles.avatar}><Headphones size={21} /></div>
        <div><strong>پشتیبانی لقمه</strong><p>{messages.at(-1)?.body || 'برای شروع، پیام خود را بنویسید'}</p></div>
      </div>
      <div className={styles.guidance}>
        <ShieldCheck size={22} />
        <strong>در کنار شما هستیم</strong>
        <p>{merchant ? 'برای پیگیری تسویه، سفارش‌ها و مسائل فروشگاه، همین‌جا با ما در ارتباط باشید' : 'برای پیگیری سفارش، تحویل بسته یا راهنمایی خرید، همین‌جا با ما در ارتباط باشید'}</p>
        <Link href={merchant ? '/merchant/orders' : '/orders'}>مشاهده سفارش‌ها <ArrowUpLeft size={16} /></Link>
      </div>
    </aside>
  );

  return (
    <aside id="support-shared-files" className={`${styles.files} ${expanded ? styles.filesExpanded : ''}`} aria-label="فایل‌های گفتگو" data-lenis-prevent>
      <div className={styles.panelHeading}><FolderOpen size={19} /><h2>فایل‌های گفتگو</h2><button className={styles.closeFiles} onClick={onClose} aria-label="بستن فایل‌ها"><X size={20} /></button></div>
      <div className={styles.profile}>
        <div className={styles.profileAvatar}><Headphones size={29} /></div>
        <strong>پشتیبانی لقمه</strong>
        <span>تاریخچه و پیوست‌های این گفتگو</span>
      </div>
      <div className={styles.fileSummary}><FolderOpen size={24} /><div><span>فایل‌های به‌اشتراک‌گذاشته‌شده</span><strong>{count(attachments.length)}</strong></div></div>
      <div className={styles.fileFilters} aria-label="نوع فایل">
        {([['all', 'همه'], ['IMAGE', 'تصاویر'], ['DOCUMENT', 'اسناد']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      <div className={styles.fileList}>
        {files.length === 0 ? <div className={styles.emptyFiles}><FileText size={25} /><p>{attachments.length ? 'فایلی از این نوع وجود ندارد' : 'هنوز فایلی ارسال نشده'}</p><span>تصاویر و اسناد ارسالی در این بخش نمایش داده می‌شوند</span></div> : files.map(file => <a key={file.id} href={file.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileItem}>
          <span className={styles.fileIcon}>{file.attachmentType === 'IMAGE' ? <ImageIcon size={19} /> : <FileText size={19} />}</span>
          <span><strong dir="auto">{file.fileName}</strong><small>{formatFileSize(file.fileSize)}</small></span><ArrowUpLeft size={15} />
        </a>)}
      </div>
      <p className={styles.fileNote}><ShieldCheck size={15} /> پیوست‌ها فقط در دسترس طرفین گفتگو هستند</p>
    </aside>
  );
}
