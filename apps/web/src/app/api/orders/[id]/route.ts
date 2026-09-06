import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/domain/order/order.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    let customerId: string | undefined;
    const token = extractSessionToken(request);
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload) {
        const customer = await prisma.customer.findUnique({
          where: { userId: payload.userId },
        });
        if (customer) {
          customerId = customer.id;
        }
      }
    }

    const order = await orderService.getOrderById(id, customerId);

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'سفارش مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت مشخصات سفارش' },
      { status: 500 }
    );
  }
}
