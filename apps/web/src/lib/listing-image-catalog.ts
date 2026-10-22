export interface ListingCatalogImage {
  readonly url: string;
  readonly label: string;
  readonly categorySlug: string;
}

export const LISTING_IMAGE_CATALOG: readonly ListingCatalogImage[] = [
  // نان و شیرینی (bakery)
  { url: "/listing-defaults/bread.png", label: "نان سنتی و کروسان", categorySlug: "bakery" },
  { url: "/listing-defaults/bakery-pastry.png", label: "شیرینی تر و دانمارکی", categorySlug: "bakery" },
  { url: "/listing-defaults/bakery-cake.png", label: "کیک و رولت عصرانه", categorySlug: "bakery" },

  // کافه و نوشیدنی (cafe)
  { url: "/listing-defaults/cafe-coffee.png", label: "قهوه، لاته و کروسان", categorySlug: "cafe" },
  { url: "/listing-defaults/cafe-salad.png", label: "سالاد سزار و ساندویچ", categorySlug: "cafe" },
  { url: "/listing-defaults/cafe-juice.png", label: "آبمیوه طبیعی و اسموتی", categorySlug: "cafe" },

  // غذا و رستوران (restaurant)
  { url: "/listing-defaults/meal.png", label: "چلو جوجه‌کباب زعفرانی", categorySlug: "restaurant" },
  { url: "/listing-defaults/restaurant-kabab.png", label: "چلوکباب کوبیده سنتی", categorySlug: "restaurant" },
  { url: "/listing-defaults/restaurant-stew.png", label: "خورشت اصیل و کته زعفرانی", categorySlug: "restaurant" },

  // سوپرمارکت و خواربار (supermarket)
  { url: "/listing-defaults/supermarket-dairy.png", label: "لبنیات و پنیر پاستوریزه", categorySlug: "supermarket" },
  { url: "/listing-defaults/supermarket-drygoods.png", label: "خواربار و خشکبار بسته‌بندی", categorySlug: "supermarket" },
  { url: "/listing-defaults/supermarket-pantry.png", label: "مربا، عسل و اقلام صبحانه", categorySlug: "supermarket" },

  // میوه و تره‌بار (produce)
  { url: "/listing-defaults/produce.png", label: "جعبه میوه و صیفی مخلوط", categorySlug: "produce" },
  { url: "/listing-defaults/produce-fruit.png", label: "سبد میوه‌های تازه فصل", categorySlug: "produce" },
  { url: "/listing-defaults/produce-vegetables.png", label: "سبزیجات تازه بوته‌ای", categorySlug: "produce" },

  // پروتئین و دلی (deli)
  { url: "/listing-defaults/deli-coldcuts.png", label: "فرآورده پروتئینی و ژامبون", categorySlug: "deli" },
  { url: "/listing-defaults/deli-poultry.png", label: "مرغ بسته‌بندی بهداشتی", categorySlug: "deli" },
  { url: "/listing-defaults/deli-meat.png", label: "گوشت قرمز شناسنامه‌دار", categorySlug: "deli" },
] as const;

export function getIllustrativeImagesForCategory(
  categorySlug?: string | null,
): readonly ListingCatalogImage[] {
  if (!categorySlug || categorySlug === "all") {
    return LISTING_IMAGE_CATALOG;
  }
  const filtered = LISTING_IMAGE_CATALOG.filter(
    (image) => image.categorySlug === categorySlug,
  );
  return filtered.length > 0 ? filtered : LISTING_IMAGE_CATALOG;
}

export function isIllustrativeImage(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.startsWith("/listing-defaults/") ||
    LISTING_IMAGE_CATALOG.some((image) => image.url === url)
  );
}
