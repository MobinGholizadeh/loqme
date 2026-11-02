'use client';

import styles from '@/components/support/support-workspace.module.css';
import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionProvider';
import { SupportChatWindow } from '@/components/support/SupportChatWindow';
import { Headphones, Clock, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function CustomerSupportPage() {
  const { user, status } = useSession();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function initConversation() {
      setLoading(true);
      setError(null);
      try {
        // 1. Check for existing customer conversation
        const res = await fetch('/api/support/conversations?channelType=CUSTOMER_ADMIN');
        const json = await res.json();

        if (json.success && json.data?.items?.length > 0) {
          setConversationId(json.data.items[0].id);
        } else {
          // 2. Create new customer support conversation
          const createRes = await fetch('/api/support/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelType: 'CUSTOMER_ADMIN',
              subject: 'پشتیبانی خریداران',
            }),
          });
          const createJson = await createRes.json();
          if (createJson.success && createJson.data) {
            setConversationId(createJson.data.id);
          } else {
            setError(createJson.message || 'خطا در ایجاد گفتگوی پشتیبانی');
          }
        }
      } catch (err: any) {
        setError(err.message || 'خطا در برقراری ارتباط');
      } finally {
        setLoading(false);
      }
    }

    initConversation();
  }, [user, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-slate-400">
        <Clock className="w-7 h-7 animate-spin text-[#1D616A] mb-2" />
        <p className="text-xs">در حال بررسی اطلاعات کاربری</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-3xl border border-slate-200/90 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#1D616A] flex items-center justify-center mx-auto mb-4">
          <Headphones className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">
          ورود به گفتگوی پشتیبانی
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          برای ارتباط مستقیم و امن با کارشناسان پشتیبانی لقمه و پیگیری سفارش‌ها، لطفاً ابتدا وارد حساب کاربری خود شوید
        </p>
        <Link
          href="/login?redirect=/support"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#1D616A] hover:bg-[#173F44] text-white font-semibold text-xs shadow-sm transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>ورود به حساب کاربری</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page} data-support-page="customer">
      <div className={styles.pageBody}>
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <Clock className="w-7 h-7 animate-spin text-[#1D616A] mb-2" />
            <p className="text-xs">در حال آماده‌سازی گفتگو</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs max-w-md">
              {error}
            </div>
          </div>
        ) : (
          <SupportChatWindow
            conversationId={conversationId}
            currentUserId={user?.id || user?.userId || ''}
            userRole="CUSTOMER"
          />
        )}
      </div>
    </div>
  );
}
