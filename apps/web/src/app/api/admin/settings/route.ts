import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/domain/admin/admin.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { UpdateSystemSettingsSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const settings = adminService.getSystemSettings();
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/settings:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت تنظیمات سیستم' },
      { status: 500 }
    );
  }
}

async function handlePUT(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const validated = UpdateSystemSettingsSchema.parse(body);

    const updated = await adminService.updateSystemSettings(
      auth.session.userId,
      validated
    );

    return NextResponse.json({
      success: true,
      message: 'تنظیمات سیستم با موفقیت بروزرسانی شد',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/settings:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ذخیره تنظیمات سیستم' },
      { status: 400 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const PUT = withDatabaseRequest(handlePUT);
