'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/components/auth/SessionProvider';
import { SupportConversationList } from '@/components/support/SupportConversationList';
import { SupportChatWindow } from '@/components/support/SupportChatWindow';
import type { SupportConversationSummaryDto, SupportRealtimeEvent } from '@loqme/types';
import { MessageSquare, ShieldCheck, RefreshCw } from 'lucide-react';

export default function AdminSupportPage() {
  const { user } = useSession();
  const [conversations, setConversations] = useState<SupportConversationSummaryDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mobile navigation state
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Load conversations
  const loadConversations = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (channelFilter !== 'ALL') params.set('channelType', channelFilter);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        params.set('limit', '50');

        const res = await fetch(`/api/support/conversations?${params.toString()}`);
        const json = await res.json();
        if (json.success && json.data) {
          setConversations(json.data.items || []);
          // Auto-select first if none selected on desktop
          if (!selectedId && json.data.items?.length > 0 && window.innerWidth >= 1024) {
            setSelectedId(json.data.items[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      } finally {
        if (showLoading) setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, channelFilter, searchQuery, selectedId]
  );

  useEffect(() => {
    loadConversations(true);
  }, [loadConversations]);

  // Real-time SSE listener for admin support updates
  useEffect(() => {
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/support/events');
      sse.onmessage = (event) => {
        try {
          const data: SupportRealtimeEvent = JSON.parse(event.data);
          if (data.type === 'message:created' || data.type === 'conversation:status') {
            loadConversations(false);
          }
        } catch {
          // ignore heartbeats
        }
      };
    } catch {
      // ignore
    }

    return () => {
      if (sse) sse.close();
    };
  }, [loadConversations]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView('chat');
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col -m-4 sm:-m-6 bg-slate-100">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#1D616A] flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">
              مرکز پشتیبانی زنده
            </h1>
            <p className="text-[11px] text-slate-500">
              مدیریت گفتگوها و پاسخگویی سریع به خریداران و فروشگاه‌های لقمه
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            loadConversations(false);
          }}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
          title="تازه‌سازی لیست"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>تازه‌سازی</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Sidebar Conversation Queue */}
        <div
          className={`w-full lg:w-96 shrink-0 h-full ${
            mobileView === 'chat' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
          }`}
        >
          <SupportConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelectConversation={handleSelect}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            channelFilter={channelFilter}
            onChannelFilterChange={setChannelFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            showChannelFilters={true}
          />
        </div>

        {/* Right Active Chat Workspace */}
        <div
          className={`flex-1 h-full ${
            mobileView === 'list' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <SupportChatWindow
            conversationId={selectedId}
            currentUserId={user?.id || ''}
            userRole="ADMIN"
            onBackToList={() => setMobileView('list')}
          />
        </div>
      </div>
    </div>
  );
}
