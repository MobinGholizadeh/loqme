import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/domain/order/order.service';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { userId: payload.userId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'پروفایل مشتری یافت نشد' },
        { status: 404 }
      );
    }

    const orders = await orderService.listCustomerOrders(customer.id);

    return NextResponse.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت لیست سفارشات' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
