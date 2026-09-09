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
          message: 'پارامترهای فیلتر نامعتبر است',
        },
        { status: 400 }
      );
    }

    const csvContent = await analyticsService.generateAnalyticsCsv(parsed.data);
    const filename = `loqme-analytics-${parsed.data.timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating analytics CSV:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'خطا در خروجی فایل تحلیلی CSV',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
