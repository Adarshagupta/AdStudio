import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { completeWorkspaceSubscriptionCheckout } from "@/lib/billing/workspace-subscription";
import { parseRequestJson } from "@/lib/http/json";

const completeSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only workspace admins can complete billing checkout." },
      { status: 403 },
    );
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = completeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  try {
    const workspace = await completeWorkspaceSubscriptionCheckout({
      sessionId: result.data.sessionId,
      workspaceId: currentUser.workspace.id,
    });

    return NextResponse.json({ ok: true, workspace });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
