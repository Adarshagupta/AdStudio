import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { getStudioFlowForUser } from "@/lib/studio-pro/flows";
import { parseRequestJson } from "@/lib/http/json";
import { presenceColorForUser } from "@/lib/studio-pro/presence-color";
import { clearStudioPresence, setStudioPresence } from "@/lib/studio-pro/realtime";

const presenceSchema = z.object({
  clientId: z.string().min(8).max(80),
  x: z.number(),
  y: z.number(),
  leave: z.boolean().optional(),
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const flow = await getStudioFlowForUser(params.id, currentUser.workspace.id);

  if (!flow) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = presenceSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  if (result.data.leave) {
    await clearStudioPresence(params.id, result.data.clientId);
    return NextResponse.json({ ok: true });
  }

  const name = currentUser.user.name?.trim() || currentUser.user.email.split("@")[0] || "Teammate";

  await setStudioPresence(params.id, {
    clientId: result.data.clientId,
    userId: currentUser.user.id,
    name,
    color: presenceColorForUser(currentUser.user.id),
    x: result.data.x,
    y: result.data.y,
    updatedAt: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
