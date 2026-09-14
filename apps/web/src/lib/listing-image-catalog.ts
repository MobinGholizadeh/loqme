export const LISTING_IMAGE_CATALOG = [
  { url: "/listing-defaults/bread.png", label: "نان و کروسان" },
  { url: "/listing-defaults/meal.png", label: "برنج و مرغ" },
  { url: "/listing-defaults/produce.png", label: "میوه و سبزیجات" },
] as const;

export function isIllustrativeImage(url?: string | null) {
  return LISTING_IMAGE_CATALOG.some((image) => image.url === url);
}
