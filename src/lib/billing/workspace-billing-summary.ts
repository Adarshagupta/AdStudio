import "server-only";

import type Stripe from "stripe";

import {
  creditsForSubscription,
  formatPlanLabel,
  getPlanPrice,
  planGenerationLimits,
  subscriptionPlans,
  type BillingInterval,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";

export type WorkspaceBillingSummary = {
  planId: SubscriptionPlanId;
  planName: string;
  tagline: string;
  interval: BillingInterval | null;
  intervalLabel: string | null;
  priceAmount: number | null;
  priceSuffix: string | null;
  creditsRemaining: number;
  creditsIncluded: number;
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
  subscriptionStatus:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "free"
    | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    videoMinutesUsed: number;
    imageCountUsed: number;
    premiumCreditsUsed: number;
  };
  limits: {
    videoMinutes: number | null;
    imageCount: number | null;
    teamMembers: number;
    storageGB: number;
  };
};

function parseInterval(value: string | null | undefined): BillingInterval | null {
  if (value === "monthly" || value === "yearly") {
    return value;
  }
  return null;
}

function parsePlanId(value: string): SubscriptionPlanId {
  if (value === "STARTER" || value === "PRO" || value === "BUSINESS") {
    return value;
  }
  return "FREE";
}

function formatBillingDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function subscriptionDetailsFromStripe(subscription: Stripe.Subscription | null) {
  if (!subscription) {
    return {
      subscriptionStatus: null as WorkspaceBillingSummary["subscriptionStatus"],
      isTrial: false,
      trialEndsAt: null as string | null,
      nextBillingDate: null as string | null,
      cancelAtPeriodEnd: false,
    };
  }

  const isTrial = subscription.status === "trialing";
  const trialEndsAt =
    isTrial && subscription.trial_end ? formatBillingDate(subscription.trial_end) : null;

  const nextBillingUnix =
    isTrial && subscription.trial_end
      ? subscription.trial_end
      : subscription.items.data[0]?.current_period_end;

  const status = subscription.status as WorkspaceBillingSummary["subscriptionStatus"];

  return {
    subscriptionStatus: status,
    isTrial,
    trialEndsAt,
    nextBillingDate: nextBillingUnix ? formatBillingDate(nextBillingUnix) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

export async function getWorkspaceBillingSummary(
  workspaceId: string,
): Promise<WorkspaceBillingSummary> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      plan: true,
      billingInterval: true,
      creditsRemaining: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      videoMinutesUsed: true,
      imageCountUsed: true,
      premiumCreditsUsed: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const planId = parsePlanId(workspace.plan);
  const plan = subscriptionPlans.find((entry) => entry.id === planId);
  const interval = parseInterval(workspace.billingInterval);
  const pricing = plan && interval ? getPlanPrice(plan, interval) : null;
  const limits = planGenerationLimits[planId];

  let stripeSubscription: Stripe.Subscription | null = null;

  if (isStripeConfigured() && workspace.stripeSubscriptionId) {
    try {
      stripeSubscription = await getStripe().subscriptions.retrieve(workspace.stripeSubscriptionId);
    } catch {
      // Subscription id may be stale — summary still works from DB fields.
    }
  }

  if (stripeSubscription) {
    const status = stripeSubscription.status;
    const shouldZeroTrialCredits =
      status === "trialing" && workspace.creditsRemaining > 0;
    if (workspace.subscriptionStatus !== status || shouldZeroTrialCredits) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          subscriptionStatus: status,
          ...(shouldZeroTrialCredits ? { creditsRemaining: 0 } : {}),
        },
      });
      if (shouldZeroTrialCredits) {
        workspace.creditsRemaining = 0;
      }
    }
  }

  const stripeDetails = subscriptionDetailsFromStripe(stripeSubscription);
  const isFree = planId === "FREE";

  return {
    planId,
    planName: plan?.name ?? formatPlanLabel(workspace.plan),
    tagline: plan?.tagline ?? "",
    interval,
    intervalLabel: interval === "yearly" ? "Yearly" : interval === "monthly" ? "Monthly" : null,
    priceAmount: pricing?.amount ?? null,
    priceSuffix: pricing?.suffix ?? null,
    creditsRemaining: workspace.creditsRemaining,
    creditsIncluded:
      interval && !isFree
        ? stripeDetails.isTrial
          ? 0
          : creditsForSubscription(planId, interval)
        : workspace.creditsRemaining,
    hasStripeCustomer: Boolean(workspace.stripeCustomerId),
    hasStripeSubscription: Boolean(workspace.stripeSubscriptionId),
    subscriptionStatus: isFree ? "free" : stripeDetails.subscriptionStatus,
    isTrial: stripeDetails.isTrial,
    trialEndsAt: stripeDetails.trialEndsAt,
    nextBillingDate: stripeDetails.nextBillingDate,
    cancelAtPeriodEnd: stripeDetails.cancelAtPeriodEnd,
    usage: {
      videoMinutesUsed: workspace.videoMinutesUsed,
      imageCountUsed: workspace.imageCountUsed,
      premiumCreditsUsed: workspace.premiumCreditsUsed,
    },
    limits: {
      videoMinutes: limits.videoMinutes === Infinity ? null : limits.videoMinutes,
      imageCount: limits.imageCount === Infinity ? null : limits.imageCount,
      teamMembers: limits.teamMembers,
      storageGB: limits.storageGB,
    },
  };
}
