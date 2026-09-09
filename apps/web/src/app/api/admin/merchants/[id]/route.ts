import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/domain/admin/admin.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { AdminUpdateMerchantSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const validated = AdminUpdateMerchantSchema.parse(body);

    const result = await adminService.updateMerchant(
      auth.session.userId,
      params.id,
      validated
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/merchants/[id]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ویرایش وضعیت فروشگاه' },
      { status: 400 }
    );
  }
}
