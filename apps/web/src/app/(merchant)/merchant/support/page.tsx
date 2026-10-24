'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionProvider';
import { SupportChatWindow } from '@/components/support/SupportChatWindow';
import { Headphones, ShieldCheck, Clock } from 'lucide-react';

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
    <div className="h-[calc(100vh-80px)] flex flex-col -m-4 sm:-m-6 bg-slate-50">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#1D616A] flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">
              ارتباط مستقیم با پشتیبانی لقمه
            </h1>
            <p className="text-[11px] text-slate-500">
              پاسخگویی به سوالات، درخواست‌های تسویه، تغییر مشخصات و مسائل عملیاتی فروشگاه
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-[#1D616A]" />
          <span>گفتگوی رسمی و محرمانه</span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
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
            currentUserId={user?.id || ''}
            userRole="MERCHANT_OWNER"
          />
        )}
      </div>
    </div>
  );
}
