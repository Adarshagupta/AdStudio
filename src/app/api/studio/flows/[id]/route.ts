import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { buildAgentChatSnapshot } from "@/lib/studio-pro/agent-sessions";
import { getStudioFlowForUser, parseFlowSnapshot, updateStudioFlow } from "@/lib/studio-pro/flows";
import { formatValidationErrors, parseRequestJson } from "@/lib/http/json";
import { publishStudioRealtimeEvent } from "@/lib/studio-pro/realtime";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

const patchSchema = z.object({
  clientId: z.string().min(8).max(80).optional(),
  name: z.string().trim().max(120).optional(),
  nodes: z.array(z.record(z.unknown())).optional(),
  edges: z.array(z.record(z.unknown())).optional(),
  viewport: z
    .object({
      zoom: z.number().min(0.4).max(2),
      pan: z.object({
        x: z.number(),
        y: z.number(),
      }),
      ui: z
        .object({
          templatePickerDismissed: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  agentChat: z
    .object({
      messages: z.array(z.record(z.unknown())),
      requestHistory: z.array(z.record(z.unknown())),
      updatedAt: z.string(),
    })
    .optional(),
});

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to Studio Pro." }, { status: 403 });
  }

  const flow = await getStudioFlowForUser(params.id, currentUser.workspace.id);

  if (!flow) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const snapshot = parseFlowSnapshot(flow.nodes, flow.edges, flow.viewport, flow.agentChat);

  return NextResponse.json({
    id: flow.id,
    name: flow.name,
    createdAt: flow.createdAt.toISOString(),
    updatedAt: flow.updatedAt.toISOString(),
    ...snapshot,
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have access to update Studio Pro sessions." }, { status: 403 });
  }

  const existing = await getStudioFlowForUser(params.id, currentUser.workspace.id);

  if (!existing) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = patchSchema.safeParse(body);

  if (!result.success) {
    const flattened = result.error.flatten();
    return NextResponse.json(
      {
        error: formatValidationErrors(flattened, "Invalid flow data."),
        errors: flattened,
      },
      { status: 400 },
    );
  }

  try {
    await updateStudioFlow(params.id, currentUser.workspace.id, {
      name: result.data.name,
      nodes: result.data.nodes as StudioNode[] | undefined,
      edges: result.data.edges as StudioEdge[] | undefined,
      viewport: result.data.viewport,
      agentChat: result.data.agentChat
        ? buildAgentChatSnapshot({
            messages: result.data.agentChat.messages as never,
            requestHistory: result.data.agentChat.requestHistory as never,
            updatedAt: result.data.agentChat.updatedAt,
          })
        : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not save flow.",
      },
      { status: 500 },
    );
  }

  const updated = await getStudioFlowForUser(params.id, currentUser.workspace.id);

  if (updated) {
    const snapshot = parseFlowSnapshot(
      updated.nodes,
      updated.edges,
      updated.viewport,
      updated.agentChat,
    );
    const displayName =
      currentUser.user.name?.trim() || currentUser.user.email.split("@")[0] || "Teammate";
    const clientId = result.data.clientId ?? "server";

    await publishStudioRealtimeEvent(params.id, {
      type: "sync",
      payload: {
        updatedAt: updated.updatedAt.toISOString(),
        clientId,
        userId: currentUser.user.id,
        name: displayName,
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        viewport: snapshot.viewport,
      },
    });

    if (result.data.agentChat) {
      await publishStudioRealtimeEvent(params.id, {
        type: "agent_chat",
        payload: {
          ...snapshot.agentChat,
          clientId,
          userId: currentUser.user.id,
          name: displayName,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    updatedAt: updated?.updatedAt.toISOString(),
  });
}
