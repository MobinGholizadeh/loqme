import { NextRequest } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { supportService } from '@/domain/support/support.service';
import { supportEvents } from '@/domain/support/support-events';
import type { SupportRealtimeEvent } from '@loqme/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = extractSessionToken(request);
  if (!token) {
    return new Response(JSON.stringify({ success: false, message: 'لطفاً وارد شوید' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return new Response(JSON.stringify({ success: false, message: 'نشست کاربری نامعتبر است' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await context.params;

  try {
    // Verify access
    await supportService.authorizeConversationAccess(id, session.userId, session.role as any);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'دسترسی غیرمجاز' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let pingInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      const initialFrame = `data: ${JSON.stringify({
        type: 'connected',
        conversationId: id,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initialFrame));

      // Subscribe to live events for this conversation
      unsubscribe = supportEvents.subscribeConversation(id, (event: SupportRealtimeEvent) => {
        try {
          const frame = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(frame));
        } catch {
          // Stream might be closed
        }
      });

      // Keepalive heartbeat every 15s to prevent proxy/browser timeout
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          // Clean up if write fails
          if (pingInterval) clearInterval(pingInterval);
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
