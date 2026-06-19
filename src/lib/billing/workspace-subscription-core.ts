import "server-only";

import type { Plan } from "@prisma/client";

import {
  clampCreditsToPlanCap,
  maxWalletCreditsForWorkspace,
} from "@/lib/billing/credit-limits";
import {
  creditsForSubscription,
  type BillingInterval,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";
import {
  isSubscriptionTrialStatus,
  walletCreditsForSubscription,
} from "@/lib/billing/subscription-trial";
import { cancelDodoSubscription } from "@/lib/billing/dodo";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";

export async function applyWorkspaceSubscriptionFromCheckout(input: {
  workspaceId: string;
  plan: SubscriptionPlanId;
  interval: BillingInterval;
  billingProvider?: "dodo" | "stripe" | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  dodoCustomerId?: string | null;
  dodoSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
}) {
  const existing = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { subscriptionStatus: true },
  });

  const status = input.subscriptionStatus ?? "active";
  const isTrial = isSubscriptionTrialStatus(status);
  const wasTrial = isSubscriptionTrialStatus(existing?.subscriptionStatus);

  let creditsRemaining = walletCreditsForSubscription(input.plan, input.interval, status);

  if (wasTrial && !isTrial && status === "active") {
    creditsRemaining = creditsForSubscription(input.plan, input.interval);
  }

  creditsRemaining = clampCreditsToPlanCap(
    creditsRemaining,
    maxWalletCreditsForWorkspace({
      plan: input.plan,
      billingInterval: input.interval,
      subscriptionStatus: status,
      welcomeCreditsClaimed: false,
    }),
  );

  return prisma.workspace.update({
    where: { id: input.workspaceId },
    data: {
      plan: input.plan as Plan,
      creditsRemaining,
      billingInterval: input.interval,
      subscriptionStatus: status,
      billingProvider: input.billingProvider ?? undefined,
      ...(input.stripeCustomerId ? { stripeCustomerId: input.stripeCustomerId } : {}),
      ...(input.stripeSubscriptionId ? { stripeSubscriptionId: input.stripeSubscriptionId } : {}),
      ...(input.dodoCustomerId ? { dodoCustomerId: input.dodoCustomerId } : {}),
      ...(input.dodoSubscriptionId ? { dodoSubscriptionId: input.dodoSubscriptionId } : {}),
      paymentSetupCompletedAt: new Date(),
    },
    select: {
      id: true,
      plan: true,
      creditsRemaining: true,
      billingInterval: true,
      subscriptionStatus: true,
    },
  });
}

export async function downgradeWorkspaceToFree(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      billingProvider: true,
      stripeSubscriptionId: true,
      dodoSubscriptionId: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  if (workspace.dodoSubscriptionId) {
    await cancelDodoSubscription(workspace.dodoSubscriptionId);
  }

  if (workspace.stripeSubscriptionId && isStripeConfigured()) {
    const stripe = getStripe();
    try {
      await stripe.subscriptions.cancel(workspace.stripeSubscriptionId);
    } catch {
      // Subscription may already be canceled in Stripe.
    }
  }

  return prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      plan: "FREE",
      creditsRemaining: creditsForSubscription("FREE", "monthly"),
      billingInterval: null,
      subscriptionStatus: null,
      billingProvider: null,
      stripeSubscriptionId: null,
      dodoSubscriptionId: null,
    },
    select: {
      id: true,
      plan: true,
      creditsRemaining: true,
    },
  });
}
