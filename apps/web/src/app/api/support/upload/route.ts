import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { saveSupportAttachmentFile } from '@/domain/support/support-storage';

export const dynamic = 'force-dynamic';

async function handlePOST(request: NextRequest) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً ابتدا وارد حساب کاربری شوید' },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'نشست کاربری نامعتبر است' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'هیچ فایلی برای بارگذاری ارسال نشده است' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const saved = await saveSupportAttachmentFile(buffer, file.name, file.type);

    const attachment = await prisma.supportAttachment.create({
      data: {
        fileName: saved.sanitizedName,
        fileSize: saved.fileSize,
        mimeType: saved.mimeType,
        fileUrl: `/api/support/attachments/${saved.storageId}`,
        attachmentType: saved.attachmentType,
        uploadedByUserId: session.userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: attachment.id,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        fileUrl: `/api/support/attachments/${attachment.id}`,
        attachmentType: attachment.attachmentType,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/support/upload:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در بارگذاری فایل' },
      { status: 400 }
    );
  }
}

export const POST = withDatabaseRequest(handlePOST);
