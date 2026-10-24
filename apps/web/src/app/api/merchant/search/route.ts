import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { extractMerchantId } from '@/lib/http/merchant-http';
import { merchantService } from '@/domain/merchant/merchant.service';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

async function handleGET(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً با حساب کاربری فروشگاه وارد شوید' },
        { status: 401, headers }
      );
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401, headers }
      );
    }

    const merchantId = extractMerchantId(request);
    const { merchant } = await merchantService.resolveMerchantAndAuthorize(session.userId, merchantId);

    const q = (request.nextUrl.searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json(
        {
          success: true,
          results: {
            orders: [],
            listings: [],
            staff: [],
          },
        },
        { headers }
      );
    }

    const [orders, listings, staff] = await Promise.all([
      prisma.order.findMany({
        where: {
          merchantId: merchant.id,
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { customer: { fullName: { contains: q, mode: 'insensitive' } } },
            { customer: { user: { mobile: { contains: q } } } },
          ],
        },
        include: {
          customer: { include: { user: true } },
          items: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.listing.findMany({
        where: {
          merchantId: merchant.id,
          OR: [
            { titleFa: { contains: q, mode: 'insensitive' } },
            { descriptionFa: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.merchantStaff.findMany({
        where: {
          merchantId: merchant.id,
          user: {
            OR: [
              { customer: { fullName: { contains: q, mode: 'insensitive' } } },
              { mobile: { contains: q } },
            ],
          },
        },
        include: {
          user: {
            include: {
              customer: true,
            },
          },
        },
        take: 3,
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        results: {
          orders: orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customer.fullName || 'مشتری لقمه',
            totalAmountToman: Number(o.totalAmountToman),
            status: o.status,
            createdAt: o.createdAt.toISOString(),
            href: '/merchant/orders',
          })),
          listings: listings.map((l) => ({
            id: l.id,
            title: l.titleFa,
            discountedPriceToman: Number(l.discountedPriceToman),
            originalPriceToman: Number(l.originalPriceToman),
            status: l.status,
            href: '/merchant/listings',
          })),
          staff: staff.map((s) => ({
            id: s.id,
            name: s.user.customer?.fullName || s.user.mobile,
            role: s.role,
            mobile: s.user.mobile,
            href: '/merchant/staff',
          })),
        },
      },
      { headers }
    );
  } catch (error: any) {
    console.error('Error in GET /api/merchant/search:', error);
    const denied = error.message?.includes('عدم دسترسی');
    return NextResponse.json(
      { success: false, message: denied ? 'عدم دسترسی به جستجوی این فروشگاه' : 'خطا در جستجو' },
      { status: denied ? 403 : 500, headers }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
