'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';
import { AdminListingItemDto, AdminCategoryDto } from '@loqme/types';

export default function AdminListingsPage() {
  const [activeTab, setActiveTab] = useState<'LISTINGS' | 'CATEGORIES'>('LISTINGS');

  // Listings State
  const [listings, setListings] = useState<AdminListingItemDto[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Categories State
  const [categories, setCategories] = useState<AdminCategoryDto[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState<boolean>(false);
  const [newCatSlug, setNewCatSlug] = useState<string>('');
  const [newCatNameFa, setNewCatNameFa] = useState<string>('');
  const [newCatIcon, setNewCatIcon] = useState<string>('🏷️');
  const [isSubmittingCat, setIsSubmittingCat] = useState<boolean>(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Listings
  const fetchListings = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (searchQuery.trim()) query.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/listings?${query.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setListings(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin listings:', err);
    } finally {
      setIsLoadingListings(false);
    }
  }, [statusFilter, searchQuery]);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const json = await res.json();
      if (json.success && json.data) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    fetchCategories();
  }, [fetchListings, fetchCategories]);

  // Create Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCat(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newCatSlug.trim().toLowerCase(),
          nameFa: newCatNameFa.trim(),
          iconUrl: newCatIcon.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: 'success', text: 'دسته‌بندی جدید با موفقیت اضافه شد' });
        setNewCatSlug('');
        setNewCatNameFa('');
        setIsNewCategoryModalOpen(false);
        fetchCategories();
      } else {
        setMessage({ type: 'error', text: json.message || 'خطا در ایجاد دسته‌بندی' });
      }
    } catch {
      setMessage({ type: 'error', text: 'ارتباط با سرور برقرار نشد' });
    } finally {
      setIsSubmittingCat(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">نظارت بر بسته‌ها و دسته‌بندی‌ها</h1>
          <p className="text-xs text-loqme-neutral-400 mt-1">
            پایش کلیه بسته‌های ارائه‌شده در پلتفرم و مدیریت درخت دسته‌بندی محصولات
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'CATEGORIES' && (
            <Button
              size="md"
              variant="primary"
              onClick={() => setIsNewCategoryModalOpen(true)}
              className="gap-2 font-bold shadow-xs"
            >
              <span>+</span>
              <span>افزودن دسته‌بندی جدید</span>
            </Button>
          )}

          <Button
            size="md"
            variant="outline"
            className="text-white border-loqme-neutral-700 hover:bg-loqme-neutral-800"
            onClick={() => {
              if (activeTab === 'LISTINGS') fetchListings();
              else fetchCategories();
            }}
          >
            🔄 بروزرسانی
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{message.type === 'success' ? '✓ ' : '❌ '} {message.text}</span>
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-loqme-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('LISTINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'LISTINGS'
              ? 'bg-loqme-primary-600 text-white shadow-xs'
              : 'text-loqme-neutral-400 hover:text-white hover:bg-loqme-neutral-800'
          }`}
        >
          بسته‌های مازاد پلتفرم ({toPersianDigits(listings.length)})
        </button>

        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'CATEGORIES'
              ? 'bg-loqme-primary-600 text-white shadow-xs'
              : 'text-loqme-neutral-400 hover:text-white hover:bg-loqme-neutral-800'
          }`}
        >
          مدیریت دسته‌بندی‌ها ({toPersianDigits(categories.length)})
        </button>
      </div>

      {/* TAB 1: Global Listings Moderation */}
      {activeTab === 'LISTINGS' && (
        <div className="space-y-4">
          <div className="bg-loqme-neutral-800/80 p-3 rounded-2xl border border-loqme-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'PUBLISHED', 'PAUSED', 'SOLD_OUT', 'EXPIRED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    statusFilter === st
                      ? 'bg-loqme-primary-600 text-white shadow-xs'
                      : 'text-loqme-neutral-400 hover:bg-loqme-neutral-700 hover:text-white'
                  }`}
                >
                  {st === 'ALL'
                    ? 'همه'
                    : st === 'PUBLISHED'
                    ? 'فعال در بازار'
                    : st === 'PAUSED'
                    ? 'متوقف شده'
                    : st === 'SOLD_OUT'
                    ? 'تکمیل ظرفیت'
                    : 'منقضی شده'}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="جستجو در عنوان بسته یا فروشگاه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-loqme-neutral-900 border border-loqme-neutral-700 rounded-xl text-white placeholder-loqme-neutral-500 focus:outline-none focus:border-loqme-primary-500"
              />
            </div>
          </div>

          {isLoadingListings ? (
            <div className="py-20 text-center space-y-2">
              <Spinner size="lg" variant="white" className="mx-auto" />
              <p className="text-xs text-loqme-neutral-400">در حال دریافت بسته‌ها...</p>
            </div>
          ) : listings.length === 0 ? (
            <EmptyState
              icon="📦"
              title="بسته‌ای یافت نشد"
              description="در حال حاضر بسته‌ای با فیلترهای انتخابی در سیستم وجود ندارد."
            />
          ) : (
            <div className="rounded-2xl bg-loqme-neutral-800/90 border border-loqme-neutral-700 overflow-hidden shadow-card">
              <table className="w-full text-right text-xs">
                <thead className="bg-loqme-neutral-900/90 text-loqme-neutral-400 border-b border-loqme-neutral-700">
                  <tr>
                    <th className="p-4">عنوان بسته</th>
                    <th className="p-4">فروشگاه عرضه کننده</th>
                    <th className="p-4">دسته‌بندی</th>
                    <th className="p-4">قیمت فروش</th>
                    <th className="p-4">تعداد</th>
                    <th className="p-4">وضعیت بازار</th>
                    <th className="p-4">وضعیت ایمنی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-loqme-neutral-700/60 text-loqme-neutral-200">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-loqme-neutral-700/30">
                      <td className="p-4 font-bold text-white text-sm">{l.titleFa}</td>
                      <td className="p-4 text-loqme-primary-300 font-medium">{l.merchantNameFa}</td>
                      <td className="p-4 text-loqme-neutral-400">{l.categoryNameFa || 'عمومی'}</td>
                      <td className="p-4 font-bold text-emerald-400">
                        {formatToman(l.discountedPriceToman)}
                        <del className="block text-[10px] text-loqme-neutral-500 font-normal">
                          {formatToman(l.originalPriceToman)}
                        </del>
                      </td>
                      <td className="p-4 font-mono font-bold text-white">
                        {toPersianDigits(l.quantity)} عدد
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-loqme-neutral-700 text-loqme-neutral-200">
                          {l.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="success" size="sm">
                          {l.safetyStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Categories Management */}
      {activeTab === 'CATEGORIES' && (
        <div className="space-y-4">
          {isLoadingCategories ? (
            <div className="py-20 text-center space-y-2">
              <Spinner size="lg" variant="white" className="mx-auto" />
              <p className="text-xs text-loqme-neutral-400">در حال دریافت دسته‌بندی‌ها...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{cat.iconUrl || '🏷️'}</span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{cat.nameFa}</h4>
                      <span className="text-[11px] font-mono text-loqme-neutral-400 block mt-0.5">
                        {cat.slug}
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-loqme-primary-400">
                      {toPersianDigits(cat.listingsCount)} بسته
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Category Modal */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-loqme-neutral-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-loqme-neutral-700 space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-loqme-neutral-800">
              <h3 className="font-black text-base text-white">تعریف دسته‌بندی محصول جدید</h3>
              <button
                onClick={() => setIsNewCategoryModalOpen(false)}
                className="text-loqme-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <Input
                  label="نام فارسی دسته‌بندی"
                  placeholder="مثال: بستنی و آبمیوه"
                  value={newCatNameFa}
                  onChange={(e) => setNewCatNameFa(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="شناسه انگلیسی (slug یکتا)"
                  placeholder="مثال: ice-cream-juice"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <Input
                  label="آیکون یا ایموجی نمایشی"
                  placeholder="مثال: 🍦"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-loqme-neutral-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  disabled={isSubmittingCat}
                  className="text-loqme-neutral-400"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingCat || !newCatNameFa || !newCatSlug}
                >
                  {isSubmittingCat ? <Spinner size="sm" variant="white" /> : 'ایجاد دسته‌بندی'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
