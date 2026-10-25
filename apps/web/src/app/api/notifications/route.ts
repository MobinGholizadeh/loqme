import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { formatToman, toPersianDigits } from '@loqme/validation';
import { notificationService } from '@/domain/notification/notification.service';
import type { NotificationDto } from '@loqme/types';

export const dynamic = 'force-dynamic';

function toRelativeTime(date: Date | string): string {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) return 'هم‌اکنون';
  if (diffMinutes < 60) return `${toPersianDigits(diffMinutes)} دقیقه پیش`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${toPersianDigits(diffHours)} ساعت پیش`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${toPersianDigits(diffDays)} روز پیش`;
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(new Date(date));
}

async function handleGET(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json({ success: true, data: [], unreadCount: 0 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ success: true, data: [], unreadCount: 0 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const isReadParam = searchParams.get('isRead');
    const isRead = isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    // 1. Fetch persisted notifications from Notification table
    const result = await notificationService.getNotifications(session.userId, {
      category,
      isRead,
      page,
      limit,
    });

    if (result.total > 0) {
      return NextResponse.json({
        success: true,
        data: result.notifications,
        unreadCount: result.unreadCount,
        unreadByCategory: result.unreadByCategory,
        total: result.total,
      });
    }

    // 2. Fallback initialization for existing active states if table was empty
    const fallbackList: NotificationDto[] = [];

    if (session.role === 'ADMIN') {
      const pendingBankAccounts = await prisma.merchantBankAccount.findMany({
        where: { status: 'PENDING', isActive: true },
        include: { merchant: { select: { businessNameFa: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      for (const b of pendingBankAccounts) {
        fallbackList.push({
          id: `admin-bank-${b.id}`,
          userId: session.userId,
          role: 'ADMIN',
          type: 'BANK_ACCOUNT_PENDING',
          category: 'system',
          title: 'حساب بانکی در انتظار بررسی',
          body: `فروشگاه «${b.merchant.businessNameFa}» حساب جدید در بانک ${b.bankName} ثبت کرده است`,
          time: toRelativeTime(b.createdAt),
          readAt: null,
          isRead: false,
          link: '/admin/finance?tab=bank_payouts',
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        });
      }

      const pendingMerchants = await prisma.merchant.findMany({
        where: { verificationStatus: 'PENDING' },
        select: { id: true, businessNameFa: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      for (const m of pendingMerchants) {
        fallbackList.push({
          id: `admin-merchant-${m.id}`,
          userId: session.userId,
          role: 'ADMIN',
          type: 'MERCHANT_PENDING',
          category: 'system',
          title: 'فروشگاه جدید در صف تأیید مدارک',
          body: `فروشگاه «${m.businessNameFa}» ثبت‌نام نموده و در انتظار احراز هویت و بررسی پروانه است`,
          time: toRelativeTime(m.createdAt),
          readAt: null,
          isRead: false,
          link: '/admin/merchants',
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        });
      }
    } else if (session.role === 'MERCHANT_OWNER' || session.role === 'MERCHANT_STAFF') {
      const owned = await prisma.merchant.findMany({
        where: { ownerUserId: session.userId },
        select: { id: true },
      });
      const staffed = await prisma.merchantStaff.findMany({
        where: { userId: session.userId },
        select: { merchant: { select: { id: true } } },
      });

      const merchantIds = Array.from(
        new Set([...owned.map((m) => m.id), ...staffed.map((s) => s.merchant.id)])
      );

      if (merchantIds.length > 0) {
        const recentOrders = await prisma.order.findMany({
          where: {
            merchantId: { in: merchantIds },
            status: { in: ['PAID', 'READY_FOR_PICKUP'] },
          },
          include: { customer: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        for (const o of recentOrders) {
          fallbackList.push({
            id: `merchant-order-${o.id}`,
            userId: session.userId,
            role: session.role,
            type: 'ORDER_RECEIVED',
            category: 'order',
            title: 'سفارش جدید آماده تحویل',
            body: `سفارش #${o.orderNumber} به مبلغ ${formatToman(Number(o.totalAmountToman))} ثبت شد (خریدار: ${o.customer?.fullName || 'مشتری لقمه'})`,
            time: toRelativeTime(o.createdAt),
            readAt: null,
            isRead: false,
            link: '/merchant/orders',
            createdAt: o.createdAt.toISOString(),
            updatedAt: o.updatedAt.toISOString(),
          });
        }
      }
    } else {
      const customer = await prisma.customer.findFirst({
        where: { userId: session.userId },
        select: { id: true },
      });

      if (customer) {
        const activeOrders = await prisma.order.findMany({
          where: {
            customerId: customer.id,
            status: { in: ['PAID', 'READY_FOR_PICKUP'] },
          },
          include: { merchant: { select: { businessNameFa: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        for (const o of activeOrders) {
          fallbackList.push({
            id: `cust-order-${o.id}`,
            userId: session.userId,
            role: 'CUSTOMER',
            type: 'ORDER_CONFIRMED',
            category: 'order',
            title: 'سفارش شما تایید شد',
            body: `سفارش #${o.orderNumber} در «${o.merchant.businessNameFa}» ثبت گردید (آماده تحویل در بازه تعیین‌شده)`,
            time: toRelativeTime(o.createdAt),
            readAt: null,
            isRead: false,
            link: '/orders',
            createdAt: o.createdAt.toISOString(),
            updatedAt: o.updatedAt.toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: fallbackList,
      unreadCount: fallbackList.filter((n) => !n.isRead).length,
      unreadByCategory: {
        order: fallbackList.filter((n) => n.category === 'order' && !n.isRead).length,
        discount: 0,
        system: fallbackList.filter((n) => n.category === 'system' && !n.isRead).length,
        support: 0,
      },
      total: fallbackList.length,
    });
  } catch (error: any) {
    console.error('[API/notifications] Error handling GET:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت اعلان‌ها' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: 'احراز هویت نشده' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ success: false, message: 'نشست نامعتبر است' }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body
    }

    const notificationId = body.notificationId;
    const result = await notificationService.markAsRead(session.userId, notificationId);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
    });
  } catch (error: any) {
    console.error('[API/notifications] Error handling POST:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در به‌روزرسانی اعلان‌ها' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const POST = withDatabaseRequest(handlePOST);
