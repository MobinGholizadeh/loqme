import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/domain/order/order.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token = extractSessionToken(request);
    if (!token) return NextResponse.json({ success: false, message: 'احراز هویت الزامی است' }, { status: 401 });
    const payload = await verifySessionToken(token);
    if (!payload) return NextResponse.json({ success: false, message: 'نشست کاربری نامعتبر است' }, { status: 401 });
    const customer = await prisma.customer.findUnique({ where: { userId: payload.userId } });
    if (!customer) return NextResponse.json({ success: false, message: 'حساب مشتری یافت نشد' }, { status: 404 });

    const order = await orderService.getOrderById(id, customer.id);

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'سفارش مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت مشخصات سفارش' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
