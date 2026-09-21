import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/admin-auth";
import {
  getMerchantAccount,
  updateMerchantAccount,
} from "@/domain/admin/merchant-account.service";
import { AdminMerchantAccountSchema } from "@loqme/validation";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function failure(error: unknown) {
  const message =
    error instanceof z.ZodError
      ? "اطلاعات واردشده معتبر نیست؛ شماره، نام و علت تغییر را بررسی کنید"
      : error instanceof Error
        ? error.message
        : "عملیات انجام نشد";
  return NextResponse.json(
    { success: false, message },
    {
      status: message.includes("عدم دسترسی")
        ? 403
        : message.includes("یافت نشد")
          ? 404
          : 400,
      headers,
    },
  );
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request);
  if ("errorResponse" in auth) return auth.errorResponse;
  try {
    const { id: paramId } = await params;
    const id = z.string().uuid().parse(paramId);
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .parse(request.nextUrl.searchParams.get("page") || 1);
    return NextResponse.json(
      {
        success: true,
        data: await getMerchantAccount(auth.session.userId, id, page),
      },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(request);
  if ("errorResponse" in auth) return auth.errorResponse;
  try {
    const { id: paramId } = await params;
    return NextResponse.json(
      await updateMerchantAccount(
        auth.session.userId,
        z.string().uuid().parse(paramId),
        AdminMerchantAccountSchema.parse(await request.json()),
      ),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
