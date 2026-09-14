import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const data = await prisma.category.findMany({
      select: { id: true, slug: true, nameFa: true },
      orderBy: { nameFa: "asc" },
    });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "دریافت دسته‌بندی‌ها انجام نشد" },
      { status: 500 },
    );
  }
}
