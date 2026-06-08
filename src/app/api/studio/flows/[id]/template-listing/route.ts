import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { getSourceFlowPublishState } from "@/lib/studio-pro/template-marketplace";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have permission to publish templates." }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const state = await getSourceFlowPublishState(currentUser.workspace.id, id);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load publish state.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
