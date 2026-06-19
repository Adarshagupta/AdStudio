import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, revalidateCurrentSessionCache } from "@/lib/auth";
import { completeWorkspaceSubscriptionCheckout } from "@/lib/billing/workspace-subscription";
import { parseRequestJson } from "@/lib/http/json";

const completeSchema = z.object({
  sessionId: z.string().min(1).optional(),
  paymentId: z.string().min(1).optional(),
}).refine((value) => Boolean(value.sessionId || value.paymentId), {
  message: "sessionId or paymentId is required.",
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
    const { workspace, purchase } = await completeWorkspaceSubscriptionCheckout({
      sessionId: result.data.sessionId,
      paymentId: result.data.paymentId,
      workspaceId: currentUser.workspace.id,
    });

    revalidateCurrentSessionCache();

    return NextResponse.json({ ok: true, workspace, purchase });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
