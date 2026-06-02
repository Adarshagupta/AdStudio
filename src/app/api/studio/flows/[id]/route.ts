import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { getStudioFlowForUser, parseFlowSnapshot, updateStudioFlow } from "@/lib/studio-pro/flows";
import type { StudioEdge, StudioNode } from "@/lib/studio-pro/types";

const patchSchema = z.object({
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

  const snapshot = parseFlowSnapshot(flow.nodes, flow.edges, flow.viewport);

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

  const body = await request.json();
  const result = patchSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  await updateStudioFlow(params.id, currentUser.workspace.id, {
    name: result.data.name,
    nodes: result.data.nodes as StudioNode[] | undefined,
    edges: result.data.edges as StudioEdge[] | undefined,
    viewport: result.data.viewport,
  });

  return NextResponse.json({ ok: true });
}
