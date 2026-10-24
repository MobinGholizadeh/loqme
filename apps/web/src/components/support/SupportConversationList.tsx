'use client';

import React from 'react';
import type { SupportConversationSummaryDto } from '@loqme/types';
import { formatRelativeTimeFa } from './support-format';
import { Search, Store, User, MessageSquare } from 'lucide-react';
import { toPersianDigits } from '@loqme/validation';

interface SupportConversationListProps {
  conversations: SupportConversationSummaryDto[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: any) => void;
  channelFilter?: string;
  onChannelFilterChange?: (channel: any) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  showChannelFilters?: boolean;
}

export function SupportConversationList({
  conversations,
  selectedId,
  onSelectConversation,
  statusFilter,
  onStatusFilterChange,
  channelFilter = 'ALL',
  onChannelFilterChange,
  searchQuery,
  onSearchQueryChange,
  showChannelFilters = true,
}: SupportConversationListProps) {
  const statusOptions = [
    { key: 'ALL', label: 'همه' },
    { key: 'OPEN', label: 'باز' },
    { key: 'RESOLVED', label: 'حل‌شده' },
    { key: 'CLOSED', label: 'بسته' },
  ];

  const channelOptions = [
    { key: 'ALL', label: 'همه کانال‌ها' },
    { key: 'CUSTOMER_ADMIN', label: 'کاربران' },
    { key: 'MERCHANT_ADMIN', label: 'فروشگاه‌ها' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200/90">
      {/* Search and Filters Header */}
      <div className="p-3.5 border-b border-slate-200/90 space-y-3 bg-slate-50/50">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="جستجو در گفتگوها و کاربران"
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1D616A] focus:ring-1 focus:ring-[#1D616A] transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {statusOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onStatusFilterChange(opt.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === opt.key
                  ? 'bg-[#1D616A] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Channel Filters (if enabled) */}
        {showChannelFilters && onChannelFilterChange && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {channelOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onChannelFilterChange(opt.key)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  channelFilter === opt.key
                    ? 'bg-teal-100/80 text-[#1D616A] border border-[#1D616A]/30'
                    : 'bg-transparent text-slate-500 hover:bg-slate-200/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversation Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 opacity-40 text-slate-400" />
            <p className="text-xs">هیچ گفتگویی یافت نشد</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isSelected = conv.id === selectedId;
            const isMerchant = conv.channelType === 'MERCHANT_ADMIN';

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-right p-3.5 flex items-start gap-3 transition-colors ${
                  isSelected
                    ? 'bg-teal-50/60 border-r-4 border-r-[#1D616A]'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isMerchant
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-teal-100 text-[#1D616A]'
                  }`}
                >
                  {isMerchant ? (
                    <Store className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-900 text-xs truncate">
                        {conv.title}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 font-medium ${
                          isMerchant
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isMerchant ? 'فروشگاه' : 'کاربر'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap mr-1">
                      {formatRelativeTimeFa(conv.lastMessageAt || conv.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate mb-1">
                    {conv.lastMessagePreview || conv.subtitle}
                  </p>

                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        conv.status === 'OPEN'
                          ? 'bg-emerald-50 text-emerald-700'
                          : conv.status === 'RESOLVED'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {conv.status === 'OPEN'
                        ? 'باز'
                        : conv.status === 'RESOLVED'
                        ? 'حل‌شده'
                        : 'بسته'}
                    </span>

                    {conv.unreadCount > 0 && (
                      <span className="bg-[#1D616A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {toPersianDigits(conv.unreadCount)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
