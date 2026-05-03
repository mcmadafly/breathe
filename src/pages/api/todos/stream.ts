import type { APIRoute } from 'astro';

import type { TodoSyncMessage } from '@/lib/todo-sync';
import { todoSync } from '@/lib/todo-sync';

/**
 * SSE stream of todo mutations for the signed-in user. EventSource sends cookies
 * on same-origin requests, so Clerk session applies via middleware.
 */
export const GET: APIRoute = async ({ locals, request }) => {
  const userId = locals.session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (msg: TodoSyncMessage) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        } catch {
          /* consumer gone */
        }
      };

      unsubscribe = todoSync.subscribe(userId, write);
      write({ type: 'sync:ready' });

      ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          if (ping !== undefined) clearInterval(ping);
        }
      }, 25_000);

      const stop = () => {
        if (ping !== undefined) clearInterval(ping);
        unsubscribe?.();
      };
      request.signal.addEventListener('abort', stop);
    },
    cancel() {
      if (ping !== undefined) clearInterval(ping);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
