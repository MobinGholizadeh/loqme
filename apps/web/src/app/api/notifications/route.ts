import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { formatToman, toPersianDigits } from '@loqme/validation';

export const dynamic = 'force-dynamic';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: 'order' | 'discount' | 'system';
  link?: string;
  createdAt: string;
}

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
      return NextResponse.json({ success: true, data: [] });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ success: true, data: [] });
    }

    const notifications: NotificationItem[] = [];

    // =========================================================================
    // 1. ADMIN NOTIFICATIONS
    // =========================================================================
    if (session.role === 'ADMIN') {
      // A. Pending Merchant Bank Accounts
      const pendingBankAccounts = await prisma.merchantBankAccount.findMany({
        where: { status: 'PENDING', isActive: true },
        include: { merchant: { select: { businessNameFa: true } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });

      for (const b of pendingBankAccounts) {
        notifications.push({
          id: `admin-bank-${b.id}`,
          title: 'حساب بانکی در انتظار بررسی',
          body: `فروشگاه «${b.merchant.businessNameFa}» حساب جدید در بانک ${b.bankName} ثبت کرده است`,
          time: toRelativeTime(b.createdAt),
          read: false,
          type: 'system',
          link: '/admin/finance?tab=bank_payouts',
          createdAt: b.createdAt.toISOString(),
        });
      }

      // B. Pending Payout Requests
      const pendingPayouts = await prisma.merchantPayoutRequest.findMany({
        where: { status: 'PENDING' },
        include: { merchant: { select: { businessNameFa: true } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });

      for (const p of pendingPayouts) {
        notifications.push({
          id: `admin-payout-${p.id}`,
          title: 'درخواست تسویه حساب مالی',
          body: `درخواست تسویه به مبلغ ${formatToman(Number(p.amountToman))} برای فروشگاه «${p.merchant.businessNameFa}» ثبت شد`,
          time: toRelativeTime(p.createdAt),
          read: false,
          type: 'system',
          link: '/admin/finance?tab=bank_payouts',
          createdAt: p.createdAt.toISOString(),
        });
      }

      // C. Pending Merchant Registrations
      const pendingMerchants = await prisma.merchant.findMany({
        where: { verificationStatus: 'PENDING' },
        select: { id: true, businessNameFa: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });

      for (const m of pendingMerchants) {
        notifications.push({
          id: `admin-merchant-${m.id}`,
          title: 'فروشگاه جدید در صف تأیید مدارک',
          body: `فروشگاه «${m.businessNameFa}» ثبت‌نام نموده و در انتظار احراز هویت و بررسی پروانه است`,
          time: toRelativeTime(m.createdAt),
          read: false,
          type: 'system',
          link: '/admin/merchants',
          createdAt: m.createdAt.toISOString(),
        });
      }

      // D. Open Complaints
      const pendingComplaints = await prisma.complaint.findMany({
        where: { status: 'PENDING' },
        include: {
          order: { select: { orderNumber: true } },
          merchant: { select: { businessNameFa: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });

      for (const c of pendingComplaints) {
        notifications.push({
          id: `admin-complaint-${c.id}`,
          title: 'شکایت / گزارش مشتری',
          body: `شکایتی برای سفارش #${c.order.orderNumber} در فروشگاه «${c.merchant.businessNameFa}» ثبت شد`,
          time: toRelativeTime(c.createdAt),
          read: false,
          type: 'order',
          link: '/admin/moderation',
          createdAt: c.createdAt.toISOString(),
        });
      }
    }

    // =========================================================================
    // 2. MERCHANT OWNER / STAFF NOTIFICATIONS
    // =========================================================================
    if (session.role === 'MERCHANT_OWNER' || session.role === 'MERCHANT_STAFF') {
      const owned = await prisma.merchant.findMany({
        where: { ownerUserId: session.userId },
        select: { id: true, businessNameFa: true },
      });
      const staffed = await prisma.merchantStaff.findMany({
        where: { userId: session.userId },
        select: { merchant: { select: { id: true, businessNameFa: true } } },
      });

      const merchantIds = Array.from(
        new Set([...owned.map((m) => m.id), ...staffed.map((s) => s.merchant.id)])
      );

      if (merchantIds.length > 0) {
        // A. Recent Orders
        const recentOrders = await prisma.order.findMany({
          where: {
            merchantId: { in: merchantIds },
            status: { in: ['PAID', 'READY_FOR_PICKUP', 'COMPLETED'] },
          },
          include: {
            customer: { select: { fullName: true } },
            merchant: { select: { businessNameFa: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        });

        for (const o of recentOrders) {
          if (o.status === 'READY_FOR_PICKUP' || o.status === 'PAID') {
            notifications.push({
              id: `merchant-order-${o.id}`,
              title: 'سفارش جدید آماده تحویل',
              body: `سفارش #${o.orderNumber} به مبلغ ${formatToman(Number(o.totalAmountToman))} ثبت شد خریدار: ${o.customer?.fullName || 'مشتری لقمه'}.`,
              time: toRelativeTime(o.createdAt),
              read: false,
              type: 'order',
              link: '/merchant/orders',
              createdAt: o.createdAt.toISOString(),
            });
          } else if (o.status === 'COMPLETED') {
            notifications.push({
              id: `merchant-completed-${o.id}`,
              title: 'تحویل موفقیت‌آمیز سفارش',
              body: `سفارش #${o.orderNumber} با کد تحویل تایید و تحویل مشتری داده شد`,
              time: toRelativeTime(o.updatedAt),
              read: true,
              type: 'order',
              link: '/merchant/orders',
              createdAt: o.updatedAt.toISOString(),
            });
          }
        }

        // B. Bank Account Updates
        const bankAccounts = await prisma.merchantBankAccount.findMany({
          where: { merchantId: { in: merchantIds }, isActive: true },
          orderBy: { updatedAt: 'desc' },
          take: 4,
        });

        for (const b of bankAccounts) {
          if (b.status === 'APPROVED') {
            notifications.push({
              id: `merchant-bank-${b.id}`,
              title: '✓ تأیید شماره شبا',
              body: `حساب بانکی ${b.bankName} با شماره شبا ${b.shabaNumber} با موفقیت توسط مدیریت تأیید شد`,
              time: toRelativeTime(b.updatedAt),
              read: false,
              type: 'system',
              link: '/merchant/finance?tab=accounts',
              createdAt: b.updatedAt.toISOString(),
            });
          } else if (b.status === 'REJECTED') {
            notifications.push({
              id: `merchant-bank-${b.id}`,
              title: 'عدم تأیید شماره شبا',
              body: `حساب بانکی ${b.shabaNumber} تأیید نشد: ${b.rejectionReason || 'عدم تطابق مشخصات فردی با حساب'}`,
              time: toRelativeTime(b.updatedAt),
              read: false,
              type: 'system',
              link: '/merchant/finance?tab=accounts',
              createdAt: b.updatedAt.toISOString(),
            });
          }
        }

        // C. Payout Updates
        const payouts = await prisma.merchantPayoutRequest.findMany({
          where: { merchantId: { in: merchantIds } },
          orderBy: { updatedAt: 'desc' },
          take: 4,
        });

        for (const p of payouts) {
          if (p.status === 'COMPLETED') {
            notifications.push({
              id: `merchant-payout-${p.id}`,
              title: 'تسویه حساب و واریز وجه',
              body: `مبلغ ${formatToman(Number(p.amountToman))} از طریق پایا به حساب بانکی شما واریز گردید (پیگیری: ${p.trackingReference || 'انجام شد'}).`,
              time: toRelativeTime(p.updatedAt),
              read: false,
              type: 'system',
              link: '/merchant/finance?tab=withdrawals',
              createdAt: p.updatedAt.toISOString(),
            });
          }
        }
      }
    }

    // =========================================================================
    // 3. CUSTOMER NOTIFICATIONS
    // =========================================================================
    if (session.role === 'CUSTOMER') {
      const customer = await prisma.customer.findFirst({
        where: { userId: session.userId },
        select: { id: true },
      });

      if (customer) {
        const customerOrders = await prisma.order.findMany({
          where: { customerId: customer.id },
          include: {
            merchant: { select: { businessNameFa: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        });

        for (const o of customerOrders) {
          if (o.status === 'PAID' || o.status === 'READY_FOR_PICKUP') {
            notifications.push({
              id: `cust-order-${o.id}`,
              title: 'سفارش شما تایید شد',
              body: `سفارش #${o.orderNumber} در «${o.merchant.businessNameFa}» ثبت گردید (آماده تحویل در بازه تعیین‌شده)`,
              time: toRelativeTime(o.createdAt),
              read: false,
              type: 'order',
              link: '/orders',
              createdAt: o.createdAt.toISOString(),
            });
          } else if (o.status === 'COMPLETED') {
            notifications.push({
              id: `cust-completed-${o.id}`,
              title: 'سفارش تحویل داده شد',
              body: `از خرید شما از «${o.merchant.businessNameFa}» سپاسگزاریم، نوش جان`,
              time: toRelativeTime(o.updatedAt),
              read: true,
              type: 'order',
              link: '/orders',
              createdAt: o.updatedAt.toISOString(),
            });
          }
        }
      }

      // Promotional Announcement / Nearby Surplus Discovery
      notifications.push({
        id: 'cust-deals-today',
        title: 'بسته‌های شگفت‌انگیز محله شما',
        body: 'فروشگاه‌های اطراف شما بسته‌های مازاد تازه را با تخفیف ۵۰٪ آماده سفارش دارند',
        time: 'امروز',
        read: false,
        type: 'discount',
        link: '/explore',
        createdAt: new Date().toISOString(),
      });
    }

    // Sort by createdAt descending
    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت پیام‌ها و اعلان‌ها' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
