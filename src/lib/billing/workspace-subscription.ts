import "server-only";

import type { Plan } from "@prisma/client";
import type Stripe from "stripe";

import {
  creditsForSubscription,
  planCheckoutPricing,
  type BillingInterval,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/integrations/app-url";

export async function getOrCreateStripeCustomer(input: {
  workspaceId: string;
  workspaceName: string;
  email: string;
}) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { stripeCustomerId: true },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  if (workspace.stripeCustomerId) {
    return workspace.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.workspaceName,
    metadata: { workspaceId: input.workspaceId },
  });

  await prisma.workspace.update({
    where: { id: input.workspaceId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createWorkspaceSubscriptionCheckout(input: {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  email: string;
  plan: SubscriptionPlanId;
  interval: BillingInterval;
  request: Request;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }

  if (input.plan === "FREE") {
    throw new Error("Use the downgrade endpoint for the Free plan.");
  }

  const pricing = planCheckoutPricing(input.plan, input.interval);
  if (!pricing) {
    throw new Error("Invalid subscription plan.");
  }

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer({
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    email: input.email,
  });

  const appUrl = getAppUrl(input.request);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pricing.unitAmountCents,
          recurring: { interval: pricing.recurringInterval },
          product_data: {
            name: pricing.label,
            metadata: {
              plan: input.plan,
              interval: input.interval,
            },
          },
        },
      },
    ],
    metadata: {
      type: "workspace_subscription",
      workspaceId: input.workspaceId,
      userId: input.userId,
      plan: input.plan,
      interval: input.interval,
    },
    success_url: `${appUrl}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings/billing?checkout=cancelled`,
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session.");
  }

  return { url: session.url, sessionId: session.id };
}

function parseCheckoutSubscriptionPlan(value: string | undefined): SubscriptionPlanId | null {
  if (value === "STARTER" || value === "PLUS" || value === "PRO") {
    return value;
  }
  return null;
}

function parseCheckoutBillingInterval(value: string | undefined): BillingInterval | null {
  if (value === "monthly" || value === "yearly") {
    return value;
  }
  return null;
}

export async function fulfillWorkspaceSubscriptionCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.type !== "workspace_subscription") {
    throw new Error("Not a workspace subscription checkout.");
  }

  if (session.status !== "complete") {
    throw new Error("Checkout is not complete yet.");
  }

  const workspaceId = session.metadata.workspaceId;
  const plan = parseCheckoutSubscriptionPlan(session.metadata.plan);
  const interval = parseCheckoutBillingInterval(session.metadata.interval);

  if (!workspaceId || !plan || !interval) {
    throw new Error("Checkout session is missing subscription metadata.");
  }

  return applyWorkspaceSubscriptionFromCheckout({
    workspaceId,
    plan,
    interval,
    stripeCustomerId:
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    stripeSubscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null,
  });
}

export async function completeWorkspaceSubscriptionCheckout(input: {
  sessionId: string;
  workspaceId: string;
}) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(input.sessionId);

  if (session.metadata?.workspaceId !== input.workspaceId) {
    throw new Error("Checkout session does not belong to this workspace.");
  }

  return fulfillWorkspaceSubscriptionCheckoutSession(session);
}

export async function applyWorkspaceSubscriptionFromCheckout(input: {
  workspaceId: string;
  plan: SubscriptionPlanId;
  interval: BillingInterval;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const creditsRemaining = creditsForSubscription(input.plan, input.interval);

  return prisma.workspace.update({
    where: { id: input.workspaceId },
    data: {
      plan: input.plan as Plan,
      creditsRemaining,
      billingInterval: input.interval,
      ...(input.stripeCustomerId ? { stripeCustomerId: input.stripeCustomerId } : {}),
      ...(input.stripeSubscriptionId ? { stripeSubscriptionId: input.stripeSubscriptionId } : {}),
      paymentSetupCompletedAt: new Date(),
    },
    select: {
      id: true,
      plan: true,
      creditsRemaining: true,
      billingInterval: true,
    },
  });
}

export async function downgradeWorkspaceToFree(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { stripeSubscriptionId: true },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
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
      stripeSubscriptionId: null,
    },
    select: {
      id: true,
      plan: true,
      creditsRemaining: true,
    },
  });
}
