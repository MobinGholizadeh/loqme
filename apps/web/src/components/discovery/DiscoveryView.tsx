"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  X,
  Sparkles,
  Croissant,
  Coffee,
  Utensils,
  ShoppingBasket,
  Apple,
  Beef,
  ShieldCheck,
} from "lucide-react";
import { ListingSummaryDto, StoreMapPin } from "@loqme/types";
import { ListingCard } from "./ListingCard";
import { NEIGHBORHOODS } from "./locations";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";

const MarketplaceMap = dynamic(
  () => import("./MarketplaceMap").then((m) => m.MarketplaceMap),
  { ssr: false, loading: () => <HeartbeatLoading /> },
);
const categories = [
  { slug: "all", label: "همه بسته‌ها", icon: Sparkles },
  { slug: "bakery", label: "نان و شیرینی", icon: Croissant },
  { slug: "cafe", label: "کافه و دسر", icon: Coffee },
  { slug: "restaurant", label: "غذا و رستوران", icon: Utensils },
  { slug: "supermarket", label: "سوپرمارکت", icon: ShoppingBasket },
  { slug: "produce", label: "میوه و سبزیجات", icon: Apple },
  { slug: "deli", label: "پروتئین", icon: Beef },
];
export function DiscoveryView({ home = false }: { home?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryString = params.toString();
  const neighborhood = NEIGHBORHOODS.find(
    (n) => n.slug === params.get("neighborhood"),
  );
  const category = params.get("category") || params.get("cat") || "all";
  const view = params.get("view") === "map" ? "map" : "feed";
  const query = params.get("q") || "";
  const radius = [500, 1000, 3000, 5000, 10000, 25000].includes(
    Number(params.get("radius")),
  )
    ? Number(params.get("radius"))
    : 5000;
  const business = params.get("business") || "";
  const maxPrice = Math.max(0, Number(params.get("maxPrice")) || 0);
  const [draftQuery, setDraftQuery] = useState(query);
  const [listings, setListings] = useState<ListingSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const refresh = () => setRetry(value => value + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [pageLimit, setPageLimit] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftRadius, setDraftRadius] = useState(radius);
  const [draftBusiness, setDraftBusiness] = useState(business);
  const [draftPrice, setDraftPrice] = useState(maxPrice);
  const navigate = useCallback(
    (changes: Record<string, string>, replace = false) => {
      const next = new URLSearchParams(queryString);
      if (next.has("cat") && !next.has("category"))
        next.set("category", next.get("cat")!);
      next.delete("cat");
      Object.entries(changes).forEach(([key, value]) => {
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
      });
      const url = pathname + (next.size ? "?" + next.toString() : "");
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [queryString, pathname, router],
  );
  useEffect(() => {
    setPageLimit(0);
  }, [neighborhood?.slug, category, radius, business, query, maxPrice]);
  useEffect(() => {
    setDraftQuery(query);
  }, [query]);
  useEffect(() => {
    if (draftQuery === query) return;
    const timer = setTimeout(
      () => navigate({ q: draftQuery.trim() }, true),
      300,
    );
    return () => clearTimeout(timer);
  }, [draftQuery, query, navigate]);
  useEffect(() => {
    if (params.has("cat")) navigate({}, true);
  }, [params, navigate]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const nearbyParams = new URLSearchParams({
          scope: neighborhood ? "nearby" : "all",
          latitude: String(neighborhood?.lat ?? NEIGHBORHOODS[0].lat),
          longitude: String(neighborhood?.lng ?? NEIGHBORHOODS[0].lng),
          radiusMeters: String(radius),
          limit: "40",
        });
        if (neighborhood?.slug && neighborhood.slug !== "all") {
          nearbyParams.set("neighborhoodSlug", neighborhood.slug);
        }
        if (category !== "all") nearbyParams.set("categorySlug", category);
        if (maxPrice) nearbyParams.set("maxPriceToman", String(maxPrice));
        if (query) nearbyParams.set("q", query);
        if (business) nearbyParams.set("businessType", business);
        let items: ListingSummaryDto[] = [];
        let next: number | null = null;
        for (let offset = 0; offset <= pageLimit; offset += 40) {
          nearbyParams.set("offset", String(offset));
          const response = await fetch("/api/listings/nearby?" + nearbyParams, {
            signal: controller.signal,
          });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.message);
          items = [...items, ...(result.data || [])];
          next = result.nextOffset ?? null;
          if (next === null) break;
        }
        if (query.length === 1)
          items = items.filter((item) =>
            (item.titleFa + " " + item.storeNameFa).includes(query),
          );
        if (!controller.signal.aborted) {
          setListings(items);
          setNextOffset(next);
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error && e.message
              ? e.message
              : "ارتباط با سرور برقرار نشد.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [
    neighborhood,
    radius,
    business,
    query,
    retry,
    category,
    maxPrice,
    pageLimit,
  ]);
  const filtered = useMemo(
    () =>
      listings.filter(
        (item) =>
          (!neighborhood ||
            neighborhood.slug === "all" ||
            item.neighborhoodSlug === neighborhood.slug ||
            item.neighborhoodNameFa === neighborhood.nameFa) &&
          (category === "all" || item.categorySlug === category) &&
          (!business || item.businessType === business) &&
          (!maxPrice || item.discountedPriceToman <= maxPrice),
      ),
    [listings, neighborhood, category, business, maxPrice],
  );
  const pins = useMemo(() => {
    const stores = new Map<string, StoreMapPin>();
    for (const item of filtered) {
      if (item.latitude == null || item.longitude == null) continue;
      const available = item.canReserve ?? item.remainingQuantity > 0;
      const store = stores.get(item.merchantId);
      if (store) {
        if (!available) continue;
        store.activeListingCount++;
        store.minPriceToman = Math.min(
          store.minPriceToman ?? Infinity,
          item.discountedPriceToman,
        );
      } else
        stores.set(item.merchantId, {
          id: item.merchantId,
          merchantId: item.merchantId,
          businessNameFa: item.storeNameFa,
          businessType: item.businessType,
          latitude: item.latitude,
          longitude: item.longitude,
          addressFa: item.addressFa || "",
          activeListingCount: available ? 1 : 0,
          minPriceToman: available ? item.discountedPriceToman : undefined,
          ratingAverage: 0,
        });
    }
    return Array.from(stores.values());
  }, [filtered]);
  const activeFilters =
    Number(radius !== 5000) +
    Number(Boolean(business)) +
    Number(Boolean(maxPrice));
  return (
    <div className="discovery-view">
      <div className="discovery-heading">
        <div>
          <h1>{home ? "لقمه‌های تازه، نزدیک شما" : "کشف طعم‌های محله"}</h1>
          <p>بسته‌های روزانه فروشگاه‌های محله، با قیمت کمتر و دریافت حضوری.</p>
        </div>
        <div className="discovery-location">
          <Select
            aria-label="محله"
            value={neighborhood?.slug || "all"}
            icon={<MapPin size={18} />}
            onChange={(e) => navigate({ neighborhood: e.target.value })}
          >
            <option value="all">همهٔ مناطق</option>
            {["urmia", "tehran"].map((city) => (
              <optgroup
                key={city}
                label={city === "urmia" ? "ارومیه" : "تهران"}
              >
                {NEIGHBORHOODS.filter((n) => n.city === city).map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.cityNameFa}، {n.nameFa}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
      </div>
      <div className="discovery-toolbar">
        <div className="discovery-search">
          <Search size={20} aria-hidden="true" />
          <input
            maxLength={100}
            aria-label="جستجوی بسته یا فروشگاه"
            placeholder="دنبال چه طعمی می‌گردید؟"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
          />
          {draftQuery && (
            <button
              className="icon-button"
              aria-label="پاک کردن جستجو"
              onClick={() => setDraftQuery("")}
            >
              <X size={18} />
            </button>
          )}
        </div>
        <Button
          variant="secondary"
          rightIcon={<SlidersHorizontal size={18} />}
          onClick={() => {
            setDraftRadius(radius);
            setDraftBusiness(business);
            setDraftPrice(maxPrice);
            setFiltersOpen(true);
          }}
        >
          فیلترها {activeFilters > 0 && toPersianDigits(activeFilters)}
        </Button>
        <div className="segmented" aria-label="نمای بسته‌ها">
          <button
            aria-pressed={view === "feed"}
            onClick={() => navigate({ view: "feed" })}
          >
            <LayoutGrid size={17} />
            لیست
          </button>
          <button
            aria-pressed={view === "map"}
            onClick={() => navigate({ view: "map" })}
          >
            <MapIcon size={17} />
            نقشه
          </button>
        </div>
      </div>
      <nav className="category-nav" aria-label="دسته‌بندی بسته‌ها">
        {categories.map((c) => (
          <button
            key={c.slug}
            aria-pressed={category === c.slug}
            onClick={() => navigate({ category: c.slug })}
          >
            <c.icon size={18} aria-hidden="true" />
            {c.label}
          </button>
        ))}
      </nav>
      {loading ? (
        <>
          <div className="section-heading">
            <h2>بسته‌های نزدیک شما</h2>
          </div>
          <div
            className="listing-grid"
            aria-label="در حال بارگذاری"
            aria-busy="true"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="listing-card">
                <div className="listing-cover animate-shimmer" />
                <div className="p-5 space-y-4">
                  <div className="animate-shimmer h-4 w-2/3 rounded" />
                  <div className="animate-shimmer h-5 w-full rounded" />
                  <div className="animate-shimmer h-10 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : error ? (
        <div className="py-12">
          <ErrorState
            title="دریافت بسته‌ها انجام نشد"
            message={error}
            onRetry={() => setRetry((r) => r + 1)}
          />
        </div>
      ) : view === "map" ? (
        <div className="map-layout">
          <MarketplaceMap
            pins={pins}
            center={[
              neighborhood?.lat ?? NEIGHBORHOODS[0].lat,
              neighborhood?.lng ?? NEIGHBORHOODS[0].lng,
            ]}
          />
          <aside className="map-results" aria-label="فروشگاه‌های روی نقشه">
            {pins.length ? (
              pins.map((pin) => (
                <Link
                  className="map-result"
                  key={pin.id}
                  href={"/merchants/" + pin.merchantId}
                >
                  <h3>{pin.businessNameFa}</h3>
                  <p>{pin.addressFa}</p>
                  <p>
                    {pin.activeListingCount ? `${toPersianDigits(pin.activeListingCount)} پیشنهاد موجود · از ${formatToman(pin.minPriceToman || 0)}` : "ناموجود"}
                  </p>
                </Link>
              ))
            ) : (
              <p>در این محدوده بسته‌ای پیدا نشد.</p>
            )}
          </aside>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="فعلاً بسته‌ای در این محدوده نیست"
            description="محله یا فیلترها را تغییر دهید و دوباره جستجو کنید."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setDraftQuery("");
                  navigate({
                    category: "",
                    q: "",
                    business: "",
                    maxPrice: "",
                    radius: "10000",
                    neighborhood: "all",
                  });
                }}
              >
                گسترش جستجو
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {(["SURPRISE_BAG", "FLASH_DEAL"] as const).map((type) => {
            const items = filtered.filter((item) => item.type === type);
            return (
              items.length > 0 && (
                <section key={type}>
                  <div className="section-heading">
                    <h2>
                      {type === "SURPRISE_BAG"
                        ? "بسته‌های شگفت‌انگیز محله"
                        : "پیشنهادهای روز"}
                    </h2>
                    <span>{toPersianDigits(items.length)} بسته</span>
                  </div>
                  <div className="listing-grid">
                    {items.map((listing, i) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        priority={i < 3}
                      />
                    ))}
                  </div>
                </section>
              )
            );
          })}
        </>
      )}
      {!loading && !error && nextOffset !== null && (
        <div className="flex justify-center py-6">
          <Button variant="secondary" onClick={() => setPageLimit(nextOffset)}>
            نمایش بسته‌های بیشتر
          </Button>
        </div>
      )}
      <div className="discovery-note">
        <ShieldCheck size={26} strokeWidth={1.5} />
        <p>
          زمان دریافت و اطلاعات حساسیت‌زا را پیش از رزرو بررسی کنید. بسته شما در
          بازه اعلام‌شده در فروشگاه تحویل داده می‌شود.
        </p>
      </div>
      <Modal
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="فیلتر بسته‌ها"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                navigate({ radius: "", business: "", maxPrice: "" });
                setFiltersOpen(false);
              }}
            >
              پاک کردن
            </Button>
            <Button
              onClick={() => {
                navigate({
                  radius: String(draftRadius),
                  business: draftBusiness,
                  maxPrice: draftPrice ? String(draftPrice) : "",
                });
                setFiltersOpen(false);
              }}
            >
              نمایش بسته‌ها
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <Select
            label="فاصله از محله"
            disabled={!neighborhood}
            value={draftRadius}
            onChange={(e) => setDraftRadius(Number(e.target.value))}
            options={[500, 1000, 3000, 5000, 10000, 25000].map((value) => ({
              value: String(value),
              label:
                value < 1000
                  ? toPersianDigits(value) + " متر"
                  : toPersianDigits(value / 1000) + " کیلومتر",
            }))}
          />
          <Select
            label="نوع فروشگاه"
            value={draftBusiness}
            onChange={(e) => setDraftBusiness(e.target.value)}
            options={[
              { value: "", label: "همه فروشگاه‌ها" },
              { value: "BAKERY", label: "نانوایی" },
              { value: "CAFE", label: "کافه" },
              { value: "RESTAURANT", label: "رستوران" },
              { value: "SUPERMARKET", label: "سوپرمارکت" },
              { value: "DELI", label: "پروتئین" },
              { value: "PRODUCE", label: "میوه و سبزیجات" },
            ]}
          />
          <label className="block text-sm">
            حداکثر قیمت: {draftPrice ? formatToman(draftPrice) : "بدون محدودیت"}
            <input
              className="w-full mt-3 accent-teal-700"
              type="range"
              min="0"
              max="1000000"
              step="25000"
              value={draftPrice}
              onChange={(e) => setDraftPrice(Number(e.target.value))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
