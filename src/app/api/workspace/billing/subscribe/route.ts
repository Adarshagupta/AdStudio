import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { clampCreditsToPlanCap, maxWalletCreditsForWorkspace } from "@/lib/billing/credits";
import {
  creditsForSubscription,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";
import { allowsDirectPaidSubscribe } from "@/lib/billing/payment-provider";
import { downgradeWorkspaceToFree } from "@/lib/billing/workspace-subscription";
import { prisma } from "@/lib/db";
import { parseRequestJson } from "@/lib/http/json";

const subscribeSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PRO", "BUSINESS"]),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
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

  const result = subscribeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const planId = result.data.plan as SubscriptionPlanId;

  if (planId !== "FREE" && !allowsDirectPaidSubscribe()) {
    return NextResponse.json(
      {
        error:
          "Paid plans require payment checkout. Use /api/workspace/billing/checkout and complete payment before the plan is applied.",
      },
      { status: 403 },
    );
  }

  const workspace =
    planId === "FREE"
      ? await downgradeWorkspaceToFree(currentUser.workspace.id)
      : await (async () => {
          const maxCredits = maxWalletCreditsForWorkspace({
            plan: planId,
            billingInterval: result.data.interval,
            subscriptionStatus: null,
            welcomeCreditsClaimed: Boolean(currentUser.workspace.welcomeCreditsClaimedAt),
          });
          const granted = creditsForSubscription(planId, result.data.interval);
          return prisma.workspace.update({
            where: { id: currentUser.workspace.id },
            data: {
              plan: planId,
              creditsRemaining: clampCreditsToPlanCap(granted, maxCredits),
              billingInterval: result.data.interval,
            },
            select: {
              id: true,
              plan: true,
              creditsRemaining: true,
            },
          });
        })();

  return NextResponse.json({
    ok: true,
    plan: workspace.plan,
    creditsRemaining: workspace.creditsRemaining,
    creditAllocation: creditsForSubscription(planId, result.data.interval),
    interval: result.data.interval,
  });
}
