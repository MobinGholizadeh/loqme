import { withDatabaseRequest } from '@/lib/db/request';
import { NextRequest, NextResponse } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { supportService } from '@/domain/support/support.service';
import { ConversationFilterSchema, CreateConversationSchema } from '@loqme/validation';
import { SupportChannelType } from '@prisma/client';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

async function handleGET(request: NextRequest) {
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
        { success: false, message: 'نشست کاربری نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = ConversationFilterSchema.parse({
      status: searchParams.get('status') || 'ALL',
      channelType: searchParams.get('channelType') || 'ALL',
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    const merchantId = searchParams.get('merchantId') || undefined;
    const result = await supportService.listConversations(
      session.userId,
      session.role as any,
      filter,
      merchantId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0]?.message || 'پارامترهای جستجو نامعتبر است' },
        { status: 400 }
      );
    }
    console.error('Error in GET /api/support/conversations:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در بارگذاری گفتگوها' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json().catch(() => ({}));
    const validated = CreateConversationSchema.parse(body);

    let conversation;
    if (validated.channelType === 'MERCHANT_ADMIN') {
      conversation = await supportService.getOrCreateMerchantConversation(
        session.userId,
        validated.merchantId ?? undefined,
        validated.subject
      );
    } else {
      conversation = await supportService.getOrCreateCustomerConversation(
        session.userId,
        validated.subject
      );
    }

    // If an initial message was supplied, send it
    if (validated.initialMessage) {
      await supportService.sendMessage({
        conversationId: conversation.id,
        senderUserId: session.userId,
        senderRole: session.role as any,
        body: validated.initialMessage,
        attachmentIds: validated.attachmentIds,
      });
      // reload conversation with the new message
      conversation = await supportService.getConversation(
        conversation.id,
        session.userId,
        session.role as any
      );
    }

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0]?.message || 'داده‌های ارسالی نامعتبر است' },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/support/conversations:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'خطا در ایجاد گفتگوی پشتیبانی' },
      { status: 500 }
    );
  }
}

export const GET = withDatabaseRequest(handleGET);
export const POST = withDatabaseRequest(handlePOST);
