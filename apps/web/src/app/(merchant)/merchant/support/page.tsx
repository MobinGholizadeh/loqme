'use client';

import styles from '@/components/support/support-workspace.module.css';
import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionProvider';
import { SupportChatWindow } from '@/components/support/SupportChatWindow';
import { Clock } from 'lucide-react';

export default function MerchantSupportPage() {
  const { user } = useSession();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initConversation() {
      setLoading(true);
      setError(null);
      try {
        // 1. Check for existing merchant conversation
        const res = await fetch('/api/support/conversations?channelType=MERCHANT_ADMIN');
        const json = await res.json();

        if (json.success && json.data?.items?.length > 0) {
          setConversationId(json.data.items[0].id);
        } else {
          // 2. Create new merchant support conversation
          const createRes = await fetch('/api/support/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelType: 'MERCHANT_ADMIN',
              subject: 'پشتیبانی فروشگاه',
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
  }, []);

  return (
    <div className={styles.page} data-support-page="merchant">
      <div className={styles.pageBody}>
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <Clock className="w-7 h-7 animate-spin text-[#1D616A] mb-2" />
            <p className="text-xs">در حال بارگذاری کانال پشتیبانی</p>
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
            userRole="MERCHANT_OWNER"
          />
        )}
      </div>
    </div>
  );
}
