import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createWorkspaceBillingPortalSession } from "@/lib/billing/workspace-subscription";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only workspace admins can manage billing." },
      { status: 403 },
    );
  }

  try {
    const portal = await createWorkspaceBillingPortalSession({
      workspaceId: currentUser.workspace.id,
      request,
    });

    return NextResponse.json(portal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open billing portal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
