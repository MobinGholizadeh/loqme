import { NextRequest, NextResponse } from 'next/server';
import { adminService } from '@/domain/admin/admin.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { AdminUpdateCustomerSchema } from '@loqme/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = AdminUpdateCustomerSchema.parse(body);

    const result = await adminService.updateCustomerStatus(
      auth.session.userId,
      id,
      validated
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/customers/[id]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در تغییر وضعیت حساب کاربری' },
      { status: 400 }
    );
  }
}
