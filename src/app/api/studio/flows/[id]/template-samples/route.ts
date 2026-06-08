import { NextResponse } from "next/server";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { getFlowTemplateSamples } from "@/lib/studio-pro/template-marketplace";

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
    const samples = await getFlowTemplateSamples(id, currentUser.workspace.id);
    return NextResponse.json({ samples });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load template samples.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
