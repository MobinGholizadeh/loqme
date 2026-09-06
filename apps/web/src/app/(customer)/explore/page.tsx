'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Select } from '@/components/ui/Select';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';
import { ListingSummaryDto, StoreMapPin } from '@loqme/types';
import { FilterModal, FilterState } from '@/components/discovery/FilterModal';

// Dynamically import Leaflet Map (SSR: false)
const MarketplaceMap = dynamic(
  () => import('@/components/discovery/MarketplaceMap').then((m) => m.MarketplaceMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[480px] md:h-[580px] rounded-3xl bg-loqme-neutral-100 flex flex-col items-center justify-center gap-3 text-loqme-neutral-500">
        <Spinner size="lg" />
        <span className="text-xs font-medium">در حال بارگذاری نقشه محله...</span>
      </div>
    ),
  }
);

interface NeighborhoodOption {
  slug: string;
  nameFa: string;
  city: 'urmia' | 'tehran';
  cityNameFa: string;
  lat: number;
  lng: number;
}

const NEIGHBORHOODS: NeighborhoodOption[] = [
  // --- Urmia (Launch City) ---
  { slug: 'daneshkadeh', nameFa: 'دانشکده', city: 'urmia', cityNameFa: 'ارومیه', lat: 37.5342, lng: 45.0681 },
  { slug: 'sheykh-tappeh', nameFa: 'شیخ‌تپه', city: 'urmia', cityNameFa: 'ارومیه', lat: 37.5258, lng: 45.0495 },
  { slug: 'ostadan', nameFa: 'استادان', city: 'urmia', cityNameFa: 'ارومیه', lat: 37.5385, lng: 45.0592 },
  { slug: 'khayyam', nameFa: 'خیام', city: 'urmia', cityNameFa: 'ارومیه', lat: 37.5501, lng: 45.0743 },
  { slug: 'kashani', nameFa: 'کاشانی', city: 'urmia', cityNameFa: 'ارومیه', lat: 37.5453, lng: 45.0702 },
  { slug: 'behdari', nameFa: 'بهداری', city: 'urmia', cityNameFa: 'ارومیه', lat: 37.5190, lng: 45.0550 },
  { slug: 'emam', nameFa: 'خیابان امام', city: 'urmia', cityNameFa: 'ارومیه', lat: 37.5530, lng: 45.0780 },
  // --- Tehran (Expansion City) ---
  { slug: 'saadat-abad', nameFa: 'سعادت‌آباد', city: 'tehran', cityNameFa: 'تهران', lat: 35.7891, lng: 51.3735 },
  { slug: 'valiasr', nameFa: 'ولیعصر', city: 'tehran', cityNameFa: 'تهران', lat: 35.7280, lng: 51.4110 },
  { slug: 'yousef-abad', nameFa: 'یوسف‌آباد', city: 'tehran', cityNameFa: 'تهران', lat: 35.7330, lng: 51.4050 },
  { slug: 'farmanieh', nameFa: 'فرمانیه', city: 'tehran', cityNameFa: 'تهران', lat: 35.8010, lng: 51.4650 },
  { slug: 'pasdaran', nameFa: 'پاسداران', city: 'tehran', cityNameFa: 'تهران', lat: 35.7650, lng: 51.4580 },
];

const CATEGORIES = [
  { slug: 'all', nameFa: 'همه دسته‌ها', icon: '✨' },
  { slug: 'bakery', nameFa: 'نان و شیرینی', icon: '🍞' },
  { slug: 'cafe', nameFa: 'کافه و دسر', icon: '☕' },
  { slug: 'restaurant', nameFa: 'غذا و رستوران', icon: '🍲' },
  { slug: 'supermarket', nameFa: 'سوپرمارکت', icon: '🛒' },
  { slug: 'produce', nameFa: 'میوه و تره‌بار', icon: '🥦' },
  { slug: 'deli', nameFa: 'پروتئین و دلی', icon: '🥩' },
];

export default function ExplorePage() {
  // State
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<NeighborhoodOption>(NEIGHBORHOODS[0]);
  const [viewMode, setViewMode] = useState<'feed' | 'map'>('feed');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    radiusMeters: 5000,
    businessType: undefined,
    dietaryTags: [],
  });

  const [listings, setListings] = useState<ListingSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch listings from API based on location, filters, and search
  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (debouncedSearch) {
        // Use debounced search route
        const params = new URLSearchParams({
          q: debouncedSearch,
          limit: '40',
        });
        const res = await fetch(`/api/listings/search?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setListings(json.data || []);
        } else {
          setErrorMsg(json.message || 'خطا در بارگذاری نتایج جستجو');
        }
      } else {
        // Use proximity radius route
        const params = new URLSearchParams({
          latitude: selectedNeighborhood.lat.toString(),
          longitude: selectedNeighborhood.lng.toString(),
          radiusMeters: filters.radiusMeters.toString(),
          limit: '40',
        });

        if (filters.businessType) {
          params.set('businessType', filters.businessType);
        }

        const res = await fetch(`/api/listings/nearby?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setListings(json.data || []);
        } else {
          setErrorMsg(json.message || 'خطا در بارگذاری لیست‌ها');
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setErrorMsg('ارتباط با سرور برقرار نشد. لطفاً اینترنت خود را بررسی کنید.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedNeighborhood, debouncedSearch, filters]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Client-side category filtering
  const filteredListings = useMemo(() => {
    if (selectedCategory === 'all') return listings;
    return listings.filter((item) => item.categorySlug === selectedCategory);
  }, [listings, selectedCategory]);

  // Separate into Surprise Bags and Flash Deals
  const surpriseBags = useMemo(() => {
    return filteredListings.filter((l) => l.type === 'SURPRISE_BAG');
  }, [filteredListings]);

  const flashDeals = useMemo(() => {
    return filteredListings.filter((l) => l.type === 'FLASH_DEAL');
  }, [filteredListings]);

  // Convert listings to unique StoreMapPins for Leaflet Map
  const mapPins: StoreMapPin[] = useMemo(() => {
    const map = new Map<string, StoreMapPin>();

    listings.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const existing = map.get(item.merchantId);
      if (existing) {
        existing.activeListingCount += 1;
        if (item.discountedPriceToman && (!existing.minPriceToman || item.discountedPriceToman < existing.minPriceToman)) {
          existing.minPriceToman = item.discountedPriceToman;
        }
      } else {
        map.set(item.merchantId, {
          id: `pin-${item.merchantId}`,
          merchantId: item.merchantId,
          businessNameFa: item.storeNameFa,
          businessType: item.businessType,
          latitude: item.latitude,
          longitude: item.longitude,
          addressFa: item.addressFa || '',
          activeListingCount: 1,
          minPriceToman: item.discountedPriceToman,
          ratingAverage: 4.9, // Default fallback
        });
      }
    });

    return Array.from(map.values());
  }, [listings]);

  // Active filter count
  const activeFilterCount = (filters.businessType ? 1 : 0) + filters.dietaryTags.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Dynamic Warm Brand Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-loqme-primary-700 via-loqme-primary-800 to-loqme-primary-900 text-white p-6 md:p-8 shadow-card">
        <div className="relative z-10 max-w-2xl space-y-2">
          <Badge variant="brand" size="sm" className="bg-white/20 text-white border-none backdrop-blur-md">
            ✨ کشف هوشمندانه محله
          </Badge>
          <h1 className="text-xl md:text-3xl font-extrabold leading-tight">
            امروز چه طعم تازه‌ای در محله شما منتظر کشف است؟
          </h1>
          <p className="text-xs md:text-sm text-loqme-primary-100/90 leading-relaxed pt-1">
            خوراکی‌ها و بسته‌های شگفت‌انگیز نان، شیرینی و کافه‌های معتبر شهر با ۵۰٪ تا ۷۰٪ تخفیف واقعی
          </p>
        </div>

        {/* Decorative background glow circles */}
        <div className="absolute -left-12 -bottom-16 w-56 h-56 rounded-full bg-loqme-primary-500/20 blur-3xl" />
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-loqme-primary-400/15 blur-2xl" />
      </div>

      {/* Neighborhood & City Selector Bar */}
      <div className="bg-white p-3.5 rounded-2xl shadow-card border border-loqme-neutral-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
          <Select
            icon={<span>📍</span>}
            value={selectedNeighborhood.slug}
            onChange={(e) => {
              const found = NEIGHBORHOODS.find((n) => n.slug === e.target.value);
              if (found) setSelectedNeighborhood(found);
            }}
            className="text-xs font-bold text-loqme-primary-800 py-1.5"
          >
            <optgroup label="شهر ارومیه (فاز ۱ - لانچ بازار)">
              {NEIGHBORHOODS.filter((n) => n.city === 'urmia').map((n) => (
                <option key={n.slug} value={n.slug}>
                  ارومیه — {n.nameFa}
                </option>
              ))}
            </optgroup>
            <optgroup label="شهر تهران (فاز ۲ - توسعه)">
              {NEIGHBORHOODS.filter((n) => n.city === 'tehran').map((n) => (
                <option key={n.slug} value={n.slug}>
                  تهران — {n.nameFa}
                </option>
              ))}
            </optgroup>
          </Select>
        </div>

        {/* View Mode Switcher (Feed vs Map) */}
        <div className="flex items-center gap-1 bg-loqme-neutral-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('feed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'feed'
                ? 'bg-white text-loqme-primary-700 shadow-xs'
                : 'text-loqme-neutral-600 hover:text-loqme-neutral-900'
            }`}
          >
            <span>📋</span>
            <span>لیست بسته‌ها</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'map'
                ? 'bg-white text-loqme-primary-700 shadow-xs'
                : 'text-loqme-neutral-600 hover:text-loqme-neutral-900'
            }`}
          >
            <span>🗺️</span>
            <span>نقشه زنده</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-2.5 rounded-2xl shadow-card border border-loqme-neutral-200 flex items-center justify-between gap-3 focus-within:border-loqme-primary-500 focus-within:ring-2 focus-within:ring-loqme-primary-50 transition-all">
        <div className="flex items-center gap-2.5 flex-1 px-2">
          <span className="text-loqme-primary-600 text-sm">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نان تازه، شیرینی سنتی ارومیه، باقلوا، کافه..."
            className="w-full bg-transparent border-none text-xs md:text-sm outline-none text-loqme-neutral-900 placeholder:text-loqme-neutral-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs w-5 h-5 rounded-full bg-loqme-neutral-100 text-loqme-neutral-500 hover:bg-loqme-neutral-200 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center gap-1.5 bg-loqme-neutral-50 hover:bg-loqme-neutral-100 border border-loqme-neutral-200 px-3.5 py-2 rounded-xl text-xs font-bold text-loqme-neutral-700 transition-colors shadow-xs"
        >
          <span>⚡ فیلترها</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-loqme-primary-600 text-white text-[10px] flex items-center justify-center font-bold">
              {toPersianDigits(activeFilterCount)}
            </span>
          )}
        </button>
      </div>

      {/* Category Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                active
                  ? 'bg-loqme-primary-700 text-white shadow-xs'
                  : 'bg-white text-loqme-neutral-700 border border-loqme-neutral-200 hover:bg-loqme-neutral-50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.nameFa}</span>
            </button>
          );
        })}
      </div>

      {/* View Content: MAP VIEW or FEED VIEW */}
      {viewMode === 'map' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-loqme-neutral-900">
              نقشه فروشگاه‌های دارای بسته در محدوده {selectedNeighborhood.nameFa}
            </h3>
            <span className="text-xs text-loqme-neutral-500">
              {toPersianDigits(mapPins.length)} فروشگاه فعال
            </span>
          </div>

          <MarketplaceMap
            pins={mapPins}
            center={[selectedNeighborhood.lat, selectedNeighborhood.lng]}
            zoom={14}
          />
        </div>
      ) : (
        /* FEED VIEW */
        <div className="space-y-8">
          {/* Loading State: Shimmer Skeletons */}
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-5 w-40 bg-loqme-neutral-200 rounded-lg animate-shimmer" />
                  <div className="h-3 w-64 bg-loqme-neutral-100 rounded-lg animate-shimmer" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && errorMsg && (
            <ErrorState
              title="خطا در بارگذاری بسته‌ها"
              message={errorMsg}
              onRetry={fetchListings}
            />
          )}

          {/* Empty State */}
          {!isLoading && !errorMsg && filteredListings.length === 0 && (
            <EmptyState
              icon="🌾"
              title="در این محدوده فعلاً بسته فعالی یافت نشد"
              description="می‌توانید شعاع جستجو را افزایش دهید، دسته‌بندی را تغییر دهید یا محله دیگری از ارومیه (مثل دانشکده، شیخ‌تپه یا خیام) را انتخاب کنید."
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, radiusMeters: 25000 }));
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                >
                  افزایش شعاع به ۲۵ کیلومتر
                </Button>
              }
            />
          )}

          {/* Surprise Bags Section */}
          {!isLoading && !errorMsg && surpriseBags.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base md:text-lg font-bold text-loqme-neutral-900">
                    بسته‌های شگفت‌انگیز (Surprise Bags)
                  </h2>
                  <p className="text-xs text-loqme-neutral-500 mt-0.5">
                    محتوای هیجان‌انگیز از بهترین محصولات تازه روز با بالاترین ارزش اقتصادی
                  </p>
                </div>
                <Badge variant="brand" size="sm">
                  {toPersianDigits(surpriseBags.length)} بسته
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {surpriseBags.map((bag) => (
                  <ListingCard key={bag.id} listing={bag} />
                ))}
              </div>
            </div>
          )}

          {/* Flash Deals Section */}
          {!isLoading && !errorMsg && flashDeals.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base md:text-lg font-bold text-loqme-neutral-900">
                    تخفیف‌های ویژه مستقیم (Flash Deals)
                  </h2>
                  <p className="text-xs text-loqme-neutral-500 mt-0.5">
                    اقلام مشخص و آماده با قیمت‌های فوق‌العاده
                  </p>
                </div>
                <Badge variant="brand" size="sm">
                  {toPersianDigits(flashDeals.length)} پیشنهاد
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {flashDeals.map((deal) => (
                  <ListingCard key={deal.id} listing={deal} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        onReset={() => {
          setFilters({
            radiusMeters: 5000,
            businessType: undefined,
            dietaryTags: [],
          });
        }}
      />
    </div>
  );
}

// Reusable Listing Card Component
function ListingCard({ listing }: { listing: ListingSummaryDto }) {
  const distanceFormatted = listing.distanceMeters
    ? listing.distanceMeters < 1000
      ? `${toPersianDigits(Math.round(listing.distanceMeters))} متر`
      : `${toPersianDigits((listing.distanceMeters / 1000).toFixed(1))} کیلومتر`
    : null;

  const savingsToman = listing.originalPriceToman - listing.discountedPriceToman;

  return (
    <Card
      variant="elevated"
      isInteractive
      className="p-5 flex flex-col justify-between hover:border-loqme-primary-400/80 transition-all rounded-2xl bg-white shadow-card hover:shadow-md"
    >
      <div>
        {/* Store & Category Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="space-y-0.5">
            <Link
              href={`/merchants/${listing.merchantId}`}
              className="font-black text-sm text-loqme-neutral-900 hover:text-loqme-primary-700 transition-colors"
            >
              {listing.storeNameFa}
            </Link>
            <div className="text-[11px] font-medium text-loqme-neutral-500">
              {listing.categoryNameFa}
              {distanceFormatted && ` • ${distanceFormatted}`}
            </div>
          </div>

          {listing.safetyVerified && (
            <Badge variant="success" size="sm">
              ✓ تضمین سلامت
            </Badge>
          )}
        </div>

        {/* Title */}
        <Link href={`/listings/${listing.id}`}>
          <h3 className="font-bold text-base text-loqme-neutral-950 my-2 hover:text-loqme-primary-600 transition-colors line-clamp-1">
            {listing.titleFa}
          </h3>
        </Link>

        {listing.descriptionFa && (
          <p className="text-xs text-loqme-neutral-600 line-clamp-2 mb-3 leading-relaxed">
            {listing.descriptionFa}
          </p>
        )}

        {/* Pickup Window & Real Scarcity Indicator */}
        <div className="bg-loqme-primary-50/70 text-loqme-primary-950 text-xs px-3 py-2 rounded-xl flex items-center justify-between my-2.5 border border-loqme-primary-100">
          <span className="flex items-center gap-1 font-medium">
            <span>⏰</span>
            <span>تحویل: {listing.pickupWindowFa}</span>
          </span>
          <span className="font-bold text-[11px] text-loqme-primary-700 bg-white px-2 py-0.5 rounded-lg border border-loqme-primary-200">
            تنها {toPersianDigits(listing.remainingQuantity)} بسته
          </span>
        </div>
      </div>

      {/* Price & Action Button Footer */}
      <div className="pt-3.5 border-t border-loqme-neutral-100 mt-2 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-loqme-neutral-400 line-through">
              {formatToman(listing.originalPriceToman)}
            </span>
            <Badge variant="brand" size="sm" className="bg-loqme-primary-100 text-loqme-primary-800 font-bold border-none text-[10px]">
              {toPersianDigits(listing.discountPercent)}٪ تخفیف
            </Badge>
          </div>
          <div className="font-black text-lg text-loqme-primary-700 leading-none pt-0.5">
            {formatToman(listing.discountedPriceToman)}
          </div>
          {savingsToman > 0 && (
            <div className="text-[10px] text-emerald-700 font-bold">
              سود شما: {formatToman(savingsToman)}
            </div>
          )}
        </div>

        <Link href={`/listings/${listing.id}`}>
          <Button size="sm" variant="primary" className="font-bold px-4 shadow-xs">
            رزرو بسته
          </Button>
        </Link>
      </div>
    </Card>
  );
}
