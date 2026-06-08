import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUserCan, getCurrentUser } from "@/lib/auth";
import { parseRequestJson } from "@/lib/http/json";
import { completeTemplatePurchaseCheckout } from "@/lib/studio-pro/template-marketplace";

const completeSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!currentUserCan(currentUser, "createContent")) {
    return NextResponse.json({ error: "You do not have permission to purchase templates." }, { status: 403 });
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
    const purchase = await completeTemplatePurchaseCheckout({
      sessionId: result.data.sessionId,
      workspaceId: currentUser.workspace.id,
    });

    return NextResponse.json({ ok: true, purchase });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
