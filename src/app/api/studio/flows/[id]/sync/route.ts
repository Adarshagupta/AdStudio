import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { studioFlowAccessForUser } from "@/lib/studio-pro/flows";
import { publishStudioRealtimeEvent } from "@/lib/studio-pro/realtime";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

const syncSchema = z.object({
  clientId: z.string().min(8).max(80),
  nodes: z.array(z.record(z.unknown())),
  edges: z.array(z.record(z.unknown())),
  viewport: z.object({
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

  const result = syncSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const displayName =
    currentUser.user.name?.trim() || currentUser.user.email.split("@")[0] || "Teammate";

  publishStudioRealtimeEvent(params.id, {
    type: "sync",
    payload: {
      updatedAt,
      clientId: result.data.clientId,
      userId: currentUser.user.id,
      name: displayName,
      nodes: result.data.nodes as StudioNode[],
      edges: result.data.edges as StudioEdge[],
      viewport: result.data.viewport,
    },
  });

  return NextResponse.json({ ok: true, updatedAt });
}
