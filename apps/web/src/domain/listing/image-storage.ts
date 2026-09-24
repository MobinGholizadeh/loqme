import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { isIllustrativeImage } from "@/lib/listing-image-catalog";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;
const root = () =>
  path.resolve(
    process.env.LISTING_IMAGE_STORAGE_DIR ||
      path.join(process.cwd(), ".data", "listing-images"),
  );

function imagePath(merchantId: string, filename: string) {
  if (
    !UUID.test(merchantId) ||
    !filename.endsWith(".webp") ||
    !UUID.test(filename.slice(0, -5))
  )
    throw new Error("شناسه تصویر نامعتبر است");
  return path.join(root(), merchantId, filename);
}

export async function normalizeListingImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_LISTING_IMAGE_BYTES)
    throw new Error("حجم تصویر باید کمتر از ۵ مگابایت باشد");
  const decoder = sharp(bytes, {
    limitInputPixels: 20000000,
    failOn: "warning",
  });
  const metadata = await decoder.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format || "") ||
    (metadata.pages || 1) > 1
  )
    throw new Error("یک عکس ثابت با فرمت JPG، PNG یا WebP انتخاب کنید");
  return decoder
    .rotate()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 6 })
    .toBuffer();
}

// Storage boundary: public food photos only. Mount this directory on persistent storage in production.
export const listingImageStorage = {
  async save(merchantId: string, bytes: Buffer) {
    const normalized = await normalizeListingImage(bytes);
    const filename = randomUUID() + ".webp";
    const destination = imagePath(merchantId, filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, normalized, { flag: "wx" });
    return `/api/listing-images/${merchantId}/${filename}`;
  },
  async read(merchantId: string, filename: string) {
    return readFile(imagePath(merchantId, filename));
  },
  async authorize(merchantId: string, url?: string) {
    if (!url || isIllustrativeImage(url)) return;
    const prefix = `/api/listing-images/${merchantId}/`;
    if (!url.startsWith(prefix))
      throw new Error("تصویر باید متعلق به همین فروشگاه باشد");
    const file = imagePath(merchantId, url.slice(prefix.length));
    try {
      await stat(file);
    } catch {
      throw new Error("تصویر یافت نشد؛ دوباره بارگذاری کنید");
    }
  },
};
