import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from "next/server";
import { extractSessionToken, verifySessionToken } from "@/lib/auth/session";
import { merchantService } from "@/domain/merchant/merchant.service";
import { extractMerchantId } from "@/lib/http/merchant-http";
import {
  listingImageStorage,
  MAX_LISTING_IMAGE_BYTES,
} from "@/domain/listing/image-storage";

export const dynamic = "force-dynamic";
async function handlePOST(request: NextRequest) {
  const token = extractSessionToken(request);
  const session = token ? await verifySessionToken(token) : null;
  if (!session)
    return NextResponse.json(
      { success: false, message: "ابتدا وارد حساب فروشگاه شوید" },
      { status: 401 },
    );
  if (!["MERCHANT_OWNER", "MERCHANT_STAFF"].includes(session.role))
    return NextResponse.json(
      { success: false, message: "این بخش مخصوص فروشنده است" },
      { status: 403 },
    );
  let merchantId: string;
  try {
    merchantId = (
      await merchantService.resolveMerchantAndAuthorize(session.userId, extractMerchantId(request), 'MANAGER')
    ).merchant.id;
  } catch {
    return NextResponse.json(
      { success: false, message: "به این فروشگاه دسترسی ندارید" },
      { status: 403 },
    );
  }
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(
      request.headers.get("content-type") || "",
    )
  )
    return NextResponse.json(
      { success: false, message: "فرمت مجاز: JPG، PNG یا WebP" },
      { status: 400 },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("تصویری انتخاب نشده است");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_LISTING_IMAGE_BYTES) {
        await reader.cancel();
        return NextResponse.json(
          { success: false, message: "حداکثر حجم تصویر ۵ مگابایت است" },
          { status: 413 },
        );
      }
      chunks.push(chunk.value);
    }
    const imageUrl = await listingImageStorage.save(
      merchantId,
      Buffer.concat(chunks),
    );
    return NextResponse.json({ success: true, imageUrl });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "ذخیره تصویر انجام نشد؛ یک عکس معتبر JPG، PNG یا WebP تا ۵ مگابایت انتخاب کنید",
      },
      { status: 400 },
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
