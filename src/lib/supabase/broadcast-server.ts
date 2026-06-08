import "server-only";

import {
  getSupabaseBroadcastKey,
  getSupabaseUrl,
  studioFlowChannelName,
} from "@/lib/supabase/config";

export async function broadcastStudioFlowMessage(
  flowId: string,
  event: string,
  payload: unknown,
): Promise<boolean> {
  const url = getSupabaseUrl();
  const key = getSupabaseBroadcastKey();
  if (!url || !key) return false;

  try {
    const response = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: studioFlowChannelName(flowId),
            event,
            payload,
            private: false,
          },
        ],
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
