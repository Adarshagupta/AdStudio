import "server-only";

import type Stripe from "stripe";

import {
  createDodoWorkspaceSubscriptionCheckout,
  waitForDodoWorkspaceSubscriptionActivation,
  createDodoWorkspaceBillingPortalSession,
} from "@/lib/billing/dodo-workspace-subscription";
import {
  purchaseDetailsFromCheckoutSession,
  type SubscriptionPurchaseDetails,
} from "@/lib/billing/purchase-summary";
import type { BillingInterval, SubscriptionPlanId } from "@/lib/billing/plans";
import { getPrimaryBillingProvider } from "@/lib/billing/payment-provider";
import { processReferralSubscriptionReward } from "@/lib/referral/program";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";
import { getOAuthAppUrl } from "@/lib/integrations/app-url";

export {
  applyWorkspaceSubscriptionFromCheckout,
  downgradeWorkspaceToFree,
} from "@/lib/billing/workspace-subscription-core";

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
  trialDays?: number;
  request: Request;
}) {
  const provider = getPrimaryBillingProvider();

  if (provider === "dodo") {
    return createDodoWorkspaceSubscriptionCheckout(input);
  }

  if (provider === "stripe") {
    return createStripeWorkspaceSubscriptionCheckout(input);
  }

  throw new Error("No payment provider is configured.");
}

async function createStripeWorkspaceSubscriptionCheckout(input: {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  email: string;
  plan: SubscriptionPlanId;
  interval: BillingInterval;
  trialDays?: number;
  request: Request;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }

  if (input.plan === "FREE") {
    throw new Error("Use the downgrade endpoint for the Free plan.");
  }

  const { planCheckoutPricing } = await import("@/lib/billing/plans");
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

  const appUrl = getOAuthAppUrl(input.request);

  const subscriptionMetadata = {
    type: "workspace_subscription",
    workspaceId: input.workspaceId,
    plan: input.plan,
    interval: input.interval,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    ...(input.trialDays
      ? {
          subscription_data: {
            trial_period_days: input.trialDays,
            metadata: subscriptionMetadata,
          },
        }
      : {}),
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
    success_url: `${appUrl}/billing/return?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing/return?checkout=cancelled`,
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session.");
  }

  return { url: session.url, sessionId: session.id };
}

function parseCheckoutSubscriptionPlan(value: string | undefined): SubscriptionPlanId | null {
  if (value === "STARTER" || value === "PRO" || value === "BUSINESS") {
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

async function resolveStripeSubscriptionStatus(
  subscriptionRef: string | Stripe.Subscription | null | undefined,
): Promise<string | null> {
  if (!subscriptionRef) {
    return null;
  }

  if (typeof subscriptionRef !== "string") {
    return subscriptionRef.status ?? null;
  }

  if (!isStripeConfigured()) {
    return null;
  }

  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionRef);
    return subscription.status;
  } catch {
    return null;
  }
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

  const { applyWorkspaceSubscriptionFromCheckout } = await import(
    "@/lib/billing/workspace-subscription-core"
  );

  const workspace = await applyWorkspaceSubscriptionFromCheckout({
    workspaceId,
    plan,
    interval,
    billingProvider: "stripe",
    stripeCustomerId:
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    stripeSubscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null,
    subscriptionStatus: await resolveStripeSubscriptionStatus(session.subscription),
  });

  const checkoutUserId = session.metadata?.userId;
  if (checkoutUserId) {
    await processReferralSubscriptionReward({
      referredUserId: checkoutUserId,
      referredWorkspaceId: workspaceId,
      plan,
      stripeCheckoutSessionId: session.id,
      stripeSubscriptionId:
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null,
    });
  }

  return workspace;
}

function isDodoCheckoutReference(value: string) {
  return value.startsWith("cks_") || value.startsWith("pay_");
}

export async function completeWorkspaceSubscriptionCheckout(input: {
  sessionId?: string;
  paymentId?: string;
  workspaceId: string;
}): Promise<{
  workspace: Awaited<ReturnType<typeof fulfillWorkspaceSubscriptionCheckoutSession>>;
  purchase: SubscriptionPurchaseDetails;
}> {
  const reference = input.sessionId ?? input.paymentId;

  if (reference && isDodoCheckoutReference(reference)) {
    return waitForDodoWorkspaceSubscriptionActivation({
      sessionId: reference.startsWith("cks_") ? reference : undefined,
      paymentId: reference.startsWith("pay_") ? reference : input.paymentId,
      workspaceId: input.workspaceId,
    });
  }

  if (!input.sessionId) {
    throw new Error("Missing checkout session id.");
  }

  const stripe = getStripe();
  const maxAttempts = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
      expand: ["subscription"],
    });

    if (session.metadata?.workspaceId !== input.workspaceId) {
      throw new Error("Checkout session does not belong to this workspace.");
    }

    try {
      const workspace = await fulfillWorkspaceSubscriptionCheckoutSession(session);
      const purchase = purchaseDetailsFromCheckoutSession(session, workspace);

      return { workspace, purchase };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Checkout fulfillment failed.");
      const retryable =
        lastError.message.includes("not complete") && attempt < maxAttempts - 1;

      if (!retryable) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Checkout fulfillment failed.");
}

export async function syncWorkspaceSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  workspaceIdOverride?: string,
) {
  const workspaceId = subscription.metadata?.workspaceId ?? workspaceIdOverride;
  const plan = parseCheckoutSubscriptionPlan(subscription.metadata?.plan);
  const interval = parseCheckoutBillingInterval(subscription.metadata?.interval);

  const isWorkspaceSubscription =
    subscription.metadata?.type === "workspace_subscription" ||
    Boolean(workspaceId && plan && interval);

  if (!isWorkspaceSubscription || !workspaceId || !plan || !interval) {
    return null;
  }

  const { applyWorkspaceSubscriptionFromCheckout, downgradeWorkspaceToFree } = await import(
    "@/lib/billing/workspace-subscription-core"
  );

  if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired" ||
    subscription.status === "unpaid"
  ) {
    return downgradeWorkspaceToFree(workspaceId);
  }

  if (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due"
  ) {
    return applyWorkspaceSubscriptionFromCheckout({
      workspaceId,
      plan,
      interval,
      billingProvider: "stripe",
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
    });
  }

  return null;
}

export async function syncWorkspaceBillingFromStripe(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });

  if (!workspace?.stripeCustomerId) {
    throw new Error("This workspace is not linked to Stripe yet.");
  }

  const stripe = getStripe();

  if (workspace.stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(workspace.stripeSubscriptionId);
      const synced = await syncWorkspaceSubscriptionFromStripe(subscription, workspaceId);
      if (synced) return synced;
    } catch {
      // Subscription id may be stale — fall through to list/search.
    }
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: workspace.stripeCustomerId,
    status: "all",
    limit: 10,
  });

  for (const subscription of subscriptions.data) {
    if (
      subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "past_due"
    ) {
      const synced = await syncWorkspaceSubscriptionFromStripe(subscription, workspaceId);
      if (synced) return synced;
    }
  }

  const sessions = await stripe.checkout.sessions.list({
    customer: workspace.stripeCustomerId,
    limit: 10,
  });

  for (const session of sessions.data) {
    if (
      session.metadata?.type === "workspace_subscription" &&
      session.metadata.workspaceId === workspaceId &&
      session.status === "complete"
    ) {
      return fulfillWorkspaceSubscriptionCheckoutSession(session);
    }
  }

  throw new Error("No active Stripe subscription found for this workspace.");
}

export async function createWorkspaceBillingPortalSession(input: {
  workspaceId: string;
  request: Request;
}) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: {
      billingProvider: true,
      stripeCustomerId: true,
      dodoCustomerId: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  if (workspace.billingProvider === "dodo" || workspace.dodoCustomerId) {
    return createDodoWorkspaceBillingPortalSession(input);
  }

  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }

  if (!workspace.stripeCustomerId) {
    throw new Error("No billing account linked yet. Subscribe to a paid plan first.");
  }

  const stripe = getStripe();
  const appUrl = getOAuthAppUrl(input.request);

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${appUrl}/settings/billing`,
  });

  if (!session.url) {
    throw new Error("Could not open billing portal.");
  }

  return { url: session.url };
}
