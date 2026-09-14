import { NextRequest, NextResponse } from "next/server";
import { listingImageStorage } from "@/domain/listing/image-storage";
export const dynamic = "force-dynamic";
export async function GET(
  _request: NextRequest,
  { params }: { params: { merchantId: string; filename: string } },
) {
  try {
    const image = await listingImageStorage.read(
      params.merchantId,
      params.filename,
    );
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
