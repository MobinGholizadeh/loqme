import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/domain/admin/admin.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { CreateCategorySchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const categories = await adminService.listCategories();
    return NextResponse.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/categories:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در دریافت دسته‌بندی‌ها' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const validated = CreateCategorySchema.parse(body);

    const category = await adminService.createCategory(
      auth.session.userId,
      validated
    );

    return NextResponse.json({
      success: true,
      message: 'دسته‌بندی جدید با موفقیت ایجاد شد',
      data: category,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/categories:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ایجاد دسته‌بندی جدید' },
      { status: 400 }
    );
  }
}
