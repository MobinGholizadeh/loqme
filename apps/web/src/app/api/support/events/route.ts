import { NextRequest } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { supportEvents } from '@/domain/support/support-events';
import type { SupportRealtimeEvent } from '@loqme/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = extractSessionToken(request);
  if (!token) {
    return new Response(JSON.stringify({ success: false, message: 'لطفاً وارد شوید' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await verifySessionToken(token);
  if (!session || session.role !== 'ADMIN') {
    return new Response(JSON.stringify({ success: false, message: 'دسترسی غیرمجاز' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let pingInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial frame
      const initialFrame = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initialFrame));

      // Subscribe to all admin support events
      unsubscribe = supportEvents.subscribeAdmin((event: SupportRealtimeEvent) => {
        try {
          const frame = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(frame));
        } catch {
          // Closed stream
        }
      });

      // Keepalive ping
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
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
