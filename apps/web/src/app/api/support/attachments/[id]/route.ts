import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getSupportAttachmentDiskPath } from '@/domain/support/support-storage';
import { supportService } from '@/domain/support/support.service';
import fs from 'fs';

export const dynamic = 'force-dynamic';

async function handleGET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'لطفاً ابتدا وارد شوید' },
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

    const { id } = await context.params;

    // The id param could be the SupportAttachment id (UUID) or the file storage name
    let attachment = await prisma.supportAttachment.findUnique({
      where: { id },
      include: {
        message: {
          select: {
            conversationId: true,
          },
        },
      },
    });

    if (!attachment) {
      // Try finding by fileUrl
      attachment = await prisma.supportAttachment.findFirst({
        where: { fileUrl: { contains: id } },
        include: {
          message: {
            select: {
              conversationId: true,
            },
          },
        },
      });
    }

    if (!attachment) {
      return NextResponse.json(
        { success: false, message: 'فایل پیوست یافت نشد' },
        { status: 404 }
      );
    }

    // Access check:
    // 1. Admin has access
    // 2. The uploader has access
    // 3. If linked to message, participants of conversation have access
    let authorized = session.role === 'ADMIN' || attachment.uploadedByUserId === session.userId;

    if (!authorized && attachment.message?.conversationId) {
      try {
        await supportService.authorizeConversationAccess(
          attachment.message.conversationId,
          session.userId,
          session.role as any
        );
        authorized = true;
      } catch {
        authorized = false;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, message: 'دسترسی به این فایل مجاز نیست' },
        { status: 403 }
      );
    }

    const diskPath = getSupportAttachmentDiskPath(attachment.fileUrl);
    if (!diskPath) {
      return NextResponse.json(
        { success: false, message: 'فایل در حافظه سرور یافت نشد' },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.promises.readFile(diskPath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        'Cache-Control': 'private, max-age=86400, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/support/attachments/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در بارگذاری فایل' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
