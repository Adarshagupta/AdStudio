import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { getStudioFlowForUser } from "@/lib/studio-pro/flows";
import { presenceColorForUser } from "@/lib/studio-pro/presence-color";
import { signStudioRealtimeToken } from "@/lib/studio-pro/realtime-jwt";
import { studioRealtimeBaseUrl } from "@/lib/studio-pro/realtime-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string };
};

export async function GET(request: Request, { params }: RouteContext) {
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

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim();
  if (!clientId || clientId.length < 8) {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }

  const baseUrl = studioRealtimeBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "Realtime service is not configured." }, { status: 503 });
  }

  const name =
    currentUser.user.name?.trim() || currentUser.user.email.split("@")[0] || "Teammate";

  const token = signStudioRealtimeToken({
    flowId: params.id,
    userId: currentUser.user.id,
    name,
    color: presenceColorForUser(currentUser.user.id),
    workspaceId: currentUser.workspace.id,
    clientId,
  });

  return NextResponse.json({
    token,
    url: baseUrl,
    expiresIn: 300,
  });
}
