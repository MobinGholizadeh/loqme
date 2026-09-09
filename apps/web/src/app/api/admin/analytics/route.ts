import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { analyticsService } from '@/domain/analytics/analytics.service';
import { AnalyticsQuerySchema } from '@loqme/validation';

export async function GET(request: NextRequest) {
  const authResult = await requireAdminSession(request);
  if ('errorResponse' in authResult) {
    return authResult.errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = {
      timeframe: searchParams.get('timeframe') || '30D',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      merchantId: searchParams.get('merchantId') || undefined,
      cityId: searchParams.get('cityId') || undefined,
    };

    const parsed = AnalyticsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'پارامترهای فیلتر تحلیلی نامعتبر است',
          errors: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const report = await analyticsService.getMarketplaceAnalytics(parsed.data);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error calculating analytics report:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'خطا در محاسبه و استخراج داده‌های تحلیلی بازار',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
