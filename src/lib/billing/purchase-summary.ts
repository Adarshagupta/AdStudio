import type Stripe from "stripe";

import {
  creditsForSubscription,
  getPlanPrice,
  subscriptionPlans,
  type BillingInterval,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";

export type SubscriptionPurchaseDetails = {
  planId: SubscriptionPlanId;
  planName: string;
  tagline: string;
  interval: BillingInterval;
  intervalLabel: string;
  priceAmount: number | null;
  priceSuffix: string;
  creditsIncluded: number;
  creditsRemaining: number;
  features: string[];
  isTrial: boolean;
  trialDays: number | null;
  trialEndsAt: string | null;
  amountDueTodayCents: number;
  currency: string;
  nextBillingDate: string | null;
};

function parsePlanId(value: string | undefined): SubscriptionPlanId | null {
  if (value === "STARTER" || value === "PRO" || value === "BUSINESS") {
    return value;
  }
  return null;
}

function parseInterval(value: string | undefined): BillingInterval | null {
  if (value === "monthly" || value === "yearly") {
    return value;
  }
  return null;
}

function formatBillingDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function buildSubscriptionPurchaseDetails(input: {
  planId: SubscriptionPlanId;
  interval: BillingInterval;
  creditsRemaining: number;
  session: Stripe.Checkout.Session;
  subscription?: Stripe.Subscription | null;
}): SubscriptionPurchaseDetails {
  const plan = subscriptionPlans.find((entry) => entry.id === input.planId);

  if (!plan) {
    throw new Error("Unknown subscription plan.");
  }

  const pricing = getPlanPrice(plan, input.interval);
  const subscription = input.subscription;
  const isTrial = subscription?.status === "trialing";
  const trialEndsAt =
    isTrial && subscription?.trial_end ? formatBillingDate(subscription.trial_end) : null;

  let trialDays: number | null = null;
  if (isTrial && subscription?.trial_start && subscription?.trial_end) {
    trialDays = Math.round((subscription.trial_end - subscription.trial_start) / 86400);
  }

  const nextBillingUnix =
    isTrial && subscription?.trial_end
      ? subscription.trial_end
      : subscription?.items.data[0]?.current_period_end;

  return {
    planId: input.planId,
    planName: plan.name,
    tagline: plan.tagline,
    interval: input.interval,
    intervalLabel: input.interval === "yearly" ? "Yearly" : "Monthly",
    priceAmount: pricing?.amount ?? null,
    priceSuffix: pricing?.suffix ?? "",
    creditsIncluded: creditsForSubscription(input.planId, input.interval),
    creditsRemaining: input.creditsRemaining,
    features: plan.features,
    isTrial,
    trialDays,
    trialEndsAt,
    amountDueTodayCents: input.session.amount_total ?? 0,
    currency: (input.session.currency ?? "usd").toUpperCase(),
    nextBillingDate: nextBillingUnix ? formatBillingDate(nextBillingUnix) : null,
  };
}

export function purchaseDetailsFromCheckoutSession(
  session: Stripe.Checkout.Session,
  workspace: { plan: string; creditsRemaining: number; billingInterval: string | null },
) {
  const planId = parsePlanId(session.metadata?.plan);
  const interval = parseInterval(session.metadata?.interval) ?? parseInterval(workspace.billingInterval ?? undefined);

  if (!planId || !interval) {
    throw new Error("Checkout session is missing plan details.");
  }

  const subscription =
    session.subscription && typeof session.subscription !== "string" ? session.subscription : null;

  return buildSubscriptionPurchaseDetails({
    planId,
    interval,
    creditsRemaining: workspace.creditsRemaining,
    session,
    subscription,
  });
}
