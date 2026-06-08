import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications/service";
import { subscribeNotificationRealtime } from "@/lib/notifications/realtime";
import type { NotificationRealtimeEvent } from "@/lib/notifications/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeEvent(event: NotificationRealtimeEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = currentUser.user.id;
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const unreadCount = await getUnreadNotificationCount(userId);
      controller.enqueue(encoder.encode(encodeEvent({ type: "hello", unreadCount })));

      unsubscribe = subscribeNotificationRealtime(userId, (event) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          closed = true;
        }
      });

      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          closed = true;
        }
      }, 15000);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
