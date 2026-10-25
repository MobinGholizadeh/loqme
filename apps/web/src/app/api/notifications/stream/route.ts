import { NextRequest } from 'next/server';
import { extractSessionToken, verifySessionToken } from '@/lib/auth/session';
import { notificationEvents } from '@/domain/notification/notification-events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = extractSessionToken(request);
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Subscribe to user's notifications
      const unsubscribeUser = notificationEvents.subscribeUser(session.userId, (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // If user is Admin, also subscribe to admin notification channel
      let unsubscribeAdmin: (() => void) | null = null;
      if (session.role === 'ADMIN') {
        unsubscribeAdmin = notificationEvents.subscribeAdmin((event) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            // Stream closed
          }
        });
      }

      // Heartbeat ping every 25 seconds to keep connection alive
      const timer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(timer);
          unsubscribeUser();
          unsubscribeAdmin?.();
        }
      }, 25000);

      request.signal.addEventListener('abort', () => {
        clearInterval(timer);
        unsubscribeUser();
        unsubscribeAdmin?.();
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
