import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import type { BillingInterval, SubscriptionPlanId } from "@/lib/billing/plans";
import { createWorkspaceSubscriptionCheckout } from "@/lib/billing/workspace-subscription";
import { parseRequestJson } from "@/lib/http/json";

const checkoutSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "BUSINESS"]),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
  trial: z.boolean().optional(),
});

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only workspace admins can change the subscription." },
      { status: 403 },
    );
  }

  const body = await parseRequestJson(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = checkoutSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  try {
    const checkout = await createWorkspaceSubscriptionCheckout({
      workspaceId: currentUser.workspace.id,
      workspaceName: currentUser.workspace.name,
      userId: currentUser.user.id,
      email: currentUser.user.email,
      plan: result.data.plan as SubscriptionPlanId,
      interval: result.data.interval as BillingInterval,
      trialDays: result.data.trial ? 7 : undefined,
      request,
    });

    return NextResponse.json(checkout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
