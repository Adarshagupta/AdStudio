import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { getStudioFlowForUser } from "@/lib/studio-pro/flows";
import {
  listStudioPresence,
  subscribeStudioRealtime,
  type StudioRealtimeEvent,
} from "@/lib/studio-pro/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string };
};

function encodeEvent(event: StudioRealtimeEvent | { type: "hello"; presence: Awaited<ReturnType<typeof listStudioPresence>> }) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return new Response("Forbidden", { status: 403 });
  }

  const flow = await getStudioFlowForUser(params.id, currentUser.workspace.id);

  if (!flow) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const presence = await listStudioPresence(params.id);
      controller.enqueue(encoder.encode(encodeEvent({ type: "hello", presence })));

      unsubscribe = subscribeStudioRealtime(params.id, (event) => {
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
