'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
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
      <div className="w-full h-[480px] md:h-[580px] rounded-3xl bg-surface-container-low flex flex-col items-center justify-center gap-3 text-on-surface-variant">
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
  { slug: 'all', nameFa: 'همه دسته‌ها', icon: 'apps' },
  { slug: 'bakery', nameFa: 'نان و شیرینی', icon: 'bakery_dining' },
  { slug: 'cafe', nameFa: 'کافه و دسر', icon: 'coffee' },
  { slug: 'restaurant', nameFa: 'غذا و رستوران', icon: 'restaurant' },
  { slug: 'supermarket', nameFa: 'سوپرمارکت', icon: 'storefront' },
  { slug: 'produce', nameFa: 'میوه و تره‌بار', icon: 'nutrition' },
  { slug: 'deli', nameFa: 'پروتئین و دلی', icon: 'lunch_dining' },
];

export default function ExplorePage() {
  // State
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<NeighborhoodOption>(NEIGHBORHOODS[0]);
  const [viewMode, setViewMode] = useState<'feed' | 'map'>('feed');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [radiusKm, setRadiusKm] = useState<number>(5);
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
        const params = new URLSearchParams({
          latitude: selectedNeighborhood.lat.toString(),
          longitude: selectedNeighborhood.lng.toString(),
          radiusMeters: (radiusKm * 1000).toString(),
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
  }, [selectedNeighborhood, debouncedSearch, filters, radiusKm]);

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
          ratingAverage: 4.9,
        });
      }
    });

    return Array.from(map.values());
  }, [listings]);

  const activeFilterCount = (filters.businessType ? 1 : 0) + filters.dietaryTags.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Stitch Design Board: Top Hero & Discovery Controller */}
      <section className="relative w-full overflow-hidden bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-sm">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-l from-primary-fixed/20 via-transparent to-secondary-fixed/20 opacity-70" />
        <div className="px-5 py-8 md:p-10 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Hero Text & Location Pill */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container w-fit">
                <span className="material-symbols-outlined text-[18px]">eco</span>
                <span className="text-xs font-bold">جنبش سراسری مبارزه با اسراف غذا</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight leading-tight">
                غذای باکیفیت و تازه را با{' '}
                <span className="text-tertiary underline decoration-secondary decoration-wavy decoration-2 underline-offset-8">
                  یک‌سوم قیمت
                </span>{' '}
                نجات دهید!
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl leading-relaxed">
                روزانه صدها نانوایی، شیرینی‌فروشی، رستوران و کافه در ارومیه و تهران بسته‌های شگفت‌انگیز غذای تازه و دست‌نخورده خود را با ۵۰٪ تا ۷۰٪ تخفیف عرضه می‌کنند.
              </p>

              {/* Interactive Search & Geo Filter */}
              <div className="mt-2 bg-surface-container-low p-2 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-2 border border-outline-variant/40">
                <div className="flex items-center gap-2 flex-1 px-3 py-1.5 w-full">
                  <span className="material-symbols-outlined text-secondary text-[22px]">location_on</span>
                  <div className="flex flex-col flex-1">
                    <span className="text-[11px] text-on-surface-variant">موقعیت محله</span>
                    <select
                      value={selectedNeighborhood.slug}
                      onChange={(e) => {
                        const found = NEIGHBORHOODS.find((n) => n.slug === e.target.value);
                        if (found) setSelectedNeighborhood(found);
                      }}
                      className="bg-transparent text-xs sm:text-sm font-bold text-on-surface outline-none cursor-pointer"
                    >
                      <optgroup label="شهر ارومیه (فاز ۱ - لانچ)">
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
                    </select>
                  </div>
                </div>

                <div className="h-8 w-px bg-outline-variant/50 hidden sm:block" />

                <div className="flex items-center gap-2 px-3 py-1.5 w-full sm:w-auto">
                  <span className="material-symbols-outlined text-outline text-[20px]">radar</span>
                  <select
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-on-surface outline-none cursor-pointer"
                  >
                    <option value={3}>تا شعاع ۳ ک‌م</option>
                    <option value={5}>تا شعاع ۵ ک‌م</option>
                    <option value={10}>تا شعاع ۱۰ ک‌م</option>
                    <option value={25}>تا شعاع ۲۵ ک‌م</option>
                  </select>
                </div>

                <button
                  onClick={() => setViewMode(viewMode === 'feed' ? 'map' : 'feed')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary-container transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {viewMode === 'feed' ? 'map' : 'view_list'}
                  </span>
                  <span>{viewMode === 'feed' ? 'مشاهده نقشه زنده' : 'مشاهده لیست'}</span>
                </button>
              </div>
            </div>

            {/* Hero Impact Teaser Graphic */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md aspect-[16/10] sm:aspect-square rounded-2xl overflow-hidden bg-surface-container shadow-md border border-outline-variant/30">
                <Image
                  src="/hero-banner.jpg"
                  alt="Loqme Persian Food Rescue"
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent flex flex-col justify-end p-5 text-on-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed animate-ping" />
                      <span className="text-xs font-bold text-secondary-fixed">
                        بیش از {toPersianDigits(listings.length || 18)} بسته در دسترس
                      </span>
                    </div>
                    <span className="text-xs font-bold bg-surface/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white">
                      میانگین ذخیره: ٪۶۵
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mt-1 text-on-primary">بسته‌های شگفت‌انگیز محله شما</h3>
                  <p className="text-xs text-on-primary-container">پیش از پایان زمان تحویل رزرو کنید.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Input and Filter Bar */}
      <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/40 shadow-sm flex items-center justify-between gap-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-fixed/40 transition-all">
        <div className="flex items-center gap-2 flex-1 px-2">
          <span className="material-symbols-outlined text-outline text-[20px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نانوایی، کافه، باقلوا، رستوران یا سوپرمارکت..."
            className="w-full bg-transparent border-none text-xs sm:text-sm outline-none text-on-surface placeholder:text-outline font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs w-5 h-5 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface transition-colors shrink-0 shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">tune</span>
          <span>فیلترها</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
              {toPersianDigits(activeFilterCount)}
            </span>
          )}
        </button>
      </div>

      {/* Stitch Design Board: Categories Horizontal Filter Strip */}
      <section className="w-full bg-surface-container-low/80 py-2.5 px-3 rounded-2xl border border-outline-variant/30 sticky top-20 z-30 shadow-xs backdrop-blur-md">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs ${
                    active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                  <span>{cat.nameFa}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* View Content: MAP VIEW or FEED VIEW */}
      {viewMode === 'map' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-on-surface">
              نقشه فروشگاه‌های فعال دارای بسته در محدوده {selectedNeighborhood.nameFa}
            </h3>
            <span className="text-xs text-on-surface-variant">
              {toPersianDigits(mapPins.length)} فروشگاه شناسایی شد
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
          {/* Loading State: Skeletons */}
          {isLoading && (
            <div className="space-y-4">
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
              description="می‌توانید شعاع جستجو را افزایش دهید، دسته‌بندی را تغییر دهید یا محله دیگری از ارومیه یا تهران را انتخاب کنید."
              action={
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-primary text-on-primary"
                  onClick={() => {
                    setRadiusKm(25);
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
                  <h2 className="text-base md:text-lg font-bold text-on-surface">
                    بسته‌های شگفت‌انگیز (Surprise Bags)
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    محتوای هیجان‌انگیز از بهترین محصولات تازه روز با بالاترین ارزش اقتصادی
                  </p>
                </div>
                <Badge variant="brand" size="sm" className="bg-primary-container text-on-primary">
                  {toPersianDigits(surpriseBags.length)} بسته
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {surpriseBags.map((bag) => (
                  <StitchListingCard key={bag.id} listing={bag} />
                ))}
              </div>
            </div>
          )}

          {/* Flash Deals Section */}
          {!isLoading && !errorMsg && flashDeals.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base md:text-lg font-bold text-on-surface">
                    تخفیف‌های ویژه مشخص (Flash Deals)
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    اقلام مشخص و شناسنامه‌دار با تخفیف‌های استثنایی
                  </p>
                </div>
                <Badge variant="brand" size="sm" className="bg-primary-container text-on-primary">
                  {toPersianDigits(flashDeals.length)} پیشنهاد
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {flashDeals.map((deal) => (
                  <StitchListingCard key={deal.id} listing={deal} />
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

// Stitch-Styled Card matching 16:10 Ratio, Remaining Pill and Dual Price
function StitchListingCard({ listing }: { listing: ListingSummaryDto }) {
  const distanceFormatted = listing.distanceMeters
    ? listing.distanceMeters < 1000
      ? `${toPersianDigits(Math.round(listing.distanceMeters))} متر`
      : `${toPersianDigits((listing.distanceMeters / 1000).toFixed(1))} ک‌م`
    : null;

  const isLowInventory = listing.remainingQuantity <= 3;

  return (
    <Card
      variant="elevated"
      isInteractive
      className="overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between hover:shadow-md hover:border-primary/40 transition-all group"
    >
      <div>
        {/* Top Photographic Header (16:10 Aspect Ratio) */}
        <div className="relative aspect-[16/10] w-full bg-surface-container overflow-hidden">
          <Image
            src="/hero-banner.jpg"
            alt={listing.titleFa}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Floating Badges */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs flex items-center gap-1 ${
                isLowInventory
                  ? 'bg-tertiary-container text-on-tertiary animate-pulse'
                  : 'bg-secondary-container text-on-secondary-container'
              }`}
            >
              {isLowInventory && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              <span>تنها {toPersianDigits(listing.remainingQuantity)} عدد</span>
            </span>
          </div>

          <div className="absolute top-2.5 left-2.5">
            <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary font-black text-xs shadow-xs">
              ٪{toPersianDigits(listing.discountPercent)} تخفیف
            </span>
          </div>

          {/* Store Name Over Image */}
          <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between text-white">
            <Link
              href={`/merchants/${listing.merchantId}`}
              className="font-bold text-xs hover:underline flex items-center gap-1 drop-shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">store</span>
              <span>{listing.storeNameFa}</span>
            </Link>
            {distanceFormatted && (
              <span className="text-[11px] font-medium bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
                {distanceFormatted}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-2.5">
          <Link href={`/listings/${listing.id}`}>
            <h3 className="font-bold text-sm text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
              {listing.titleFa}
            </h3>
          </Link>

          {listing.descriptionFa && (
            <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
              {listing.descriptionFa}
            </p>
          )}

          {/* Pickup Window Pill */}
          <div className="bg-surface-container-low px-3 py-1.5 rounded-xl flex items-center justify-between text-xs text-on-surface-variant border border-outline-variant/30">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
              <span>تحویل: {listing.pickupWindowFa}</span>
            </div>
            {listing.safetyVerified && (
              <span className="text-[10px] font-bold text-secondary flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span>تضمین بهداشت</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price and Action Footer */}
      <div className="p-4 pt-0 mt-2 flex items-center justify-between border-t border-outline-variant/20 pt-3">
        <div>
          <div className="text-[11px] text-outline line-through">
            {formatToman(listing.originalPriceToman)}
          </div>
          <div className="font-extrabold text-base text-primary leading-none">
            {formatToman(listing.discountedPriceToman)}
          </div>
        </div>

        <Link href={`/listings/${listing.id}`}>
          <Button
            size="sm"
            variant="primary"
            rounded="pill"
            className="bg-primary hover:bg-primary-container text-white px-4 text-xs font-bold shadow-xs active:scale-95"
          >
            رزرو لقمه
          </Button>
        </Link>
      </div>
    </Card>
  );
}
