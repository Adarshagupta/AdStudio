import "server-only";

import type { Subscription } from "dodopayments/resources/subscriptions.js";

import { getDodoCheckoutPricing } from "@/lib/billing/dodo-subscription-product";
import { getDodo } from "@/lib/billing/dodo";
import { creditsForSubscription, type BillingInterval, type SubscriptionPlanId } from "@/lib/billing/plans";
import { clampCreditsToPlanCap, maxWalletCreditsForWorkspace } from "@/lib/billing/credit-limits";
import { prisma } from "@/lib/db";

const WORKSPACE_SUBSCRIPTION_TYPE = "workspace_subscription";

function parsePlan(value: string | null | undefined): SubscriptionPlanId | null {
  if (value === "STARTER" || value === "PRO" || value === "BUSINESS") {
    return value;
  }
  return null;
}

function parseInterval(value: string | null | undefined): BillingInterval | null {
  if (value === "monthly" || value === "yearly") {
    return value;
  }
  return null;
}

function renewalMetadata(subscription: Subscription, workspaceId: string, plan: SubscriptionPlanId, interval: BillingInterval) {
  return {
    type: WORKSPACE_SUBSCRIPTION_TYPE,
    workspaceId,
    plan,
    interval,
    subscriptionId: subscription.subscription_id,
    renewal: "true",
  };
}

export async function chargeDueDodoSubscriptionRenewals() {
  const workspaces = await prisma.workspace.findMany({
    where: {
      billingProvider: "dodo",
      dodoSubscriptionId: { not: null },
      plan: { in: ["STARTER", "PRO", "BUSINESS"] },
    },
    select: {
      id: true,
      plan: true,
      billingInterval: true,
      dodoSubscriptionId: true,
      subscriptionStatus: true,
    },
  });

  const dodo = getDodo();
  let charged = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const workspace of workspaces) {
    if (!workspace.dodoSubscriptionId) {
      skipped += 1;
      continue;
    }

    const plan = parsePlan(workspace.plan);
    const interval = parseInterval(workspace.billingInterval);
    if (!plan || !interval) {
      skipped += 1;
      continue;
    }

    try {
      const subscription = await dodo.subscriptions.retrieve(workspace.dodoSubscriptionId);

      if (!subscription.on_demand || subscription.status !== "active") {
        skipped += 1;
        continue;
      }

      const dueAt = new Date(subscription.next_billing_date);
      if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() > Date.now()) {
        skipped += 1;
        continue;
      }

      const pricing = getDodoCheckoutPricing(plan, interval);
      if (!pricing) {
        skipped += 1;
        continue;
      }

      await dodo.subscriptions.charge(workspace.dodoSubscriptionId, {
        product_price: pricing.unitAmountCents,
        product_description: `${pricing.label} renewal`,
        metadata: renewalMetadata(subscription, workspace.id, plan, interval),
      });

      const maxCredits = maxWalletCreditsForWorkspace({
        plan,
        billingInterval: interval,
        subscriptionStatus: "active",
        welcomeCreditsClaimed: false,
      });

      await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          creditsRemaining: clampCreditsToPlanCap(creditsForSubscription(plan, interval), maxCredits),
          subscriptionStatus: "active",
        },
      });

      charged += 1;
    } catch (error) {
      errors.push(
        `${workspace.id}: ${error instanceof Error ? error.message : "Renewal charge failed."}`,
      );
    }
  }

  return { charged, skipped, errors };
}

export async function syncDodoSubscriptionRenewalFromWebhook(subscription: Subscription) {
  if (!subscription.on_demand) {
    return null;
  }

  const workspaceId = subscription.metadata?.workspaceId;
  const plan = parsePlan(subscription.metadata?.plan);
  const interval = parseInterval(subscription.metadata?.interval);

  if (!workspaceId || !plan || !interval) {
    return null;
  }

  const maxCredits = maxWalletCreditsForWorkspace({
    plan,
    billingInterval: interval,
    subscriptionStatus: "active",
    welcomeCreditsClaimed: false,
  });

  return prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      creditsRemaining: clampCreditsToPlanCap(creditsForSubscription(plan, interval), maxCredits),
      subscriptionStatus: "active",
      dodoSubscriptionId: subscription.subscription_id,
      dodoCustomerId: subscription.customer.customer_id,
    },
  });
}
