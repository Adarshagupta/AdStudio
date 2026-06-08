import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { buildAgentChatSnapshot } from "@/lib/studio-pro/agent-sessions";
import { studioFlowAccessForUser } from "@/lib/studio-pro/flows";
import { parseRequestJson } from "@/lib/http/json";
import { publishStudioRealtimeEvent } from "@/lib/studio-pro/realtime";

const agentSyncSchema = z.object({
  clientId: z.string().min(8).max(80),
  agentChat: z.object({
    messages: z.array(z.record(z.unknown())),
    requestHistory: z.array(z.record(z.unknown())),
    updatedAt: z.string(),
  }),
});

type RouteContext = {
  params: { id: string };
};

export async function POST(request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to Studio Pro." }, { status: 403 });
  }

  const access = await studioFlowAccessForUser(params.id, currentUser.workspace.id);

  if (!access) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = agentSyncSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const displayName =
    currentUser.user.name?.trim() || currentUser.user.email.split("@")[0] || "Teammate";

  const agentChat = buildAgentChatSnapshot({
    messages: result.data.agentChat.messages as never,
    requestHistory: result.data.agentChat.requestHistory as never,
    updatedAt: result.data.agentChat.updatedAt,
  });

  publishStudioRealtimeEvent(params.id, {
    type: "agent_chat",
    payload: {
      ...agentChat,
      clientId: result.data.clientId,
      userId: currentUser.user.id,
      name: displayName,
    },
  });

  return NextResponse.json({ ok: true, updatedAt: agentChat.updatedAt });
}
