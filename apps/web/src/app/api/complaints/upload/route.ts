import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 4;

export async function POST(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'هیچ تصویری بارگذاری نشده است' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, message: `حداکثر ${MAX_FILES} تصویر به طور همزمان قابل بارگذاری است` },
        { status: 400 }
      );
    }

    // Ensure upload directory exists in public/uploads/evidence
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'evidence');
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { success: false, message: 'فرمت تصویر نامعتبر است. فرمت‌های مجاز: JPG, PNG, WEBP' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: 'حجم هر تصویر حداکثر می‌تواند ۵ مگابایت باشد' },
          { status: 400 }
        );
      }

      const extension = file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg';
      const fileName = `${crypto.randomUUID()}${extension}`;
      const filePath = path.join(uploadDir, fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      uploadedUrls.push(`/uploads/evidence/${fileName}`);
    }

    return NextResponse.json({
      success: true,
      message: 'تصاویر با موفقیت بارگذاری شدند',
      urls: uploadedUrls,
    });
  } catch (error: any) {
    console.error('Error uploading complaint evidence:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در بارگذاری تصاویر' },
      { status: 500 }
    );
  }
}
