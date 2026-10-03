import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/domain/user/user.service';
import { isValidIranianMobile, normalizeIranianMobile } from '@/lib/utils/persian';

async function checkAccount(mobileParam: string | null) {
  if (!mobileParam || !isValidIranianMobile(mobileParam)) {
    return NextResponse.json(
      { success: false, exists: false, message: 'شماره موبایل واردشده معتبر نمی‌باشد' },
      { status: 400 }
    );
  }

  const normalized = normalizeIranianMobile(mobileParam);
  const user = await userService.findByMobile(normalized);

  if (!user) {
    return NextResponse.json(
      {
        success: true,
        exists: false,
        mobile: normalized,
        message: 'حساب کاربری با این شماره یافت نشد. می‌توانید ثبت‌نام کنید.',
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      exists: true,
      mobile: normalized,
      role: user.role,
      isActive: user.isActive,
    },
    { status: 200 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mobile = searchParams.get('mobile');
    return await checkAccount(mobile);
  } catch (error) {
    console.error('Error in GET /api/auth/check-account:', error);
    return NextResponse.json(
      { success: false, exists: false, message: 'خطای سرور در بررسی حساب' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return await checkAccount(body?.mobile);
  } catch (error) {
    console.error('Error in POST /api/auth/check-account:', error);
    return NextResponse.json(
      { success: false, exists: false, message: 'خطای سرور در بررسی حساب' },
      { status: 500 }
    );
  }
}
