"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { isIllustrativeImage } from "@/lib/listing-image-catalog";
export function ListingImage({
  src,
  alt,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const origin = process.env.NEXT_PUBLIC_INVENTORY_IMAGE_ORIGIN;
  const allowed =
    src &&
    ((src.startsWith("/") && !src.startsWith("//")) ||
      (origin && src.startsWith(origin.replace(/\/$/, "") + "/")));
  return allowed && !failed ? (
    <>
      <Image
        src={src!}
        alt={alt}
        fill
        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
        priority={priority}
        onError={() => setFailed(true)}
        className="object-cover"
      />
      {isIllustrativeImage(src) && (
        <span className="absolute top-2 left-2 z-10 bg-white/95 text-loqme-neutral-800 text-[10px] px-2 py-1 rounded">
          تصویر تزئینی
        </span>
      )}
    </>
  ) : (
    <div className="image-placeholder">
      <ImageOff size={32} strokeWidth={1.3} aria-hidden="true" />
      <span>تصویر بسته ثبت نشده است</span>
    </div>
  );
}
