import "server-only";

import type { Subscription } from "dodopayments/resources/subscriptions.js";

import {
  convertUsdCentsToInrPaise,
  getDodoCheckoutCurrency,
  getDodoCheckoutFeatureFlags,
  getIndiaCheckoutPaymentMethods,
} from "@/lib/billing/dodo-checkout-config";
import { getDodoCheckoutPricing, getDodoSubscriptionProductId } from "@/lib/billing/dodo-subscription-product";
import { getDodo } from "@/lib/billing/dodo";
import {
  purchaseDetailsFromDodoCheckout,
  type SubscriptionPurchaseDetails,
} from "@/lib/billing/purchase-summary";
import type { BillingInterval, SubscriptionPlanId } from "@/lib/billing/plans";
import {
  applyWorkspaceSubscriptionFromCheckout,
  downgradeWorkspaceToFree,
} from "@/lib/billing/workspace-subscription-core";
import { processReferralSubscriptionReward } from "@/lib/referral/program";
import { prisma } from "@/lib/db";
import { getOAuthAppUrl } from "@/lib/integrations/app-url";

const WORKSPACE_SUBSCRIPTION_TYPE = "workspace_subscription";

export async function createDodoWorkspaceSubscriptionCheckout(input: {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  email: string;
  plan: SubscriptionPlanId;
  interval: BillingInterval;
  trialDays?: number;
  request: Request;
}) {
  if (input.plan === "FREE") {
    throw new Error("Use the downgrade endpoint for the Free plan.");
  }

  const productId = getDodoSubscriptionProductId();
  if (!productId) {
    throw new Error(
      "Dodo subscription product is not configured. Set DODO_SUBSCRIPTION_PRODUCT_ID to your on-demand subscription product.",
    );
  }

  const pricing = getDodoCheckoutPricing(input.plan, input.interval);
  if (!pricing) {
    throw new Error("Invalid subscription plan.");
  }

  const appUrl = getOAuthAppUrl(input.request);
  const dodo = getDodo();
  const checkoutCurrency = getDodoCheckoutCurrency(input.request);
  const isInrCheckout = checkoutCurrency === "INR";
  const unitAmountCents = isInrCheckout
    ? convertUsdCentsToInrPaise(pricing.unitAmountCents)
    : pricing.unitAmountCents;

  const metadata = {
    type: WORKSPACE_SUBSCRIPTION_TYPE,
    workspaceId: input.workspaceId,
    userId: input.userId,
    plan: input.plan,
    interval: input.interval,
    priceCents: String(unitAmountCents),
    priceLabel: pricing.label,
    checkoutCurrency,
  };

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email: input.email,
      name: input.workspaceName,
    },
    metadata,
    return_url: `${appUrl}/billing/return?checkout=success`,
    ...(isInrCheckout ? { billing_currency: "INR" as const } : {}),
    ...(isInrCheckout ? { allowed_payment_method_types: getIndiaCheckoutPaymentMethods() } : {}),
    feature_flags: getDodoCheckoutFeatureFlags(),
    customization: {
      show_on_demand_tag: false,
    },
    subscription_data: {
      ...(input.trialDays
        ? {
            trial_period_days: input.trialDays,
            on_demand: {
              mandate_only: true,
            },
          }
        : {
            on_demand: {
              mandate_only: false,
              product_price: unitAmountCents,
              product_description: pricing.label,
              product_currency: checkoutCurrency,
            },
          }),
    },
  });

  if (!session.checkout_url) {
    throw new Error("Failed to create Dodo checkout session.");
  }

  return { url: session.checkout_url, sessionId: session.session_id };
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

export function mapDodoSubscriptionStatus(subscription: Subscription) {
  if (subscription.status === "cancelled") {
    return "canceled";
  }

  if (subscription.status === "on_hold") {
    return "past_due";
  }

  if (subscription.status === "failed") {
    return "unpaid";
  }

  if (subscription.trial_period_days > 0) {
    const createdAt = new Date(subscription.created_at);
    const trialEndsAt = new Date(createdAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + subscription.trial_period_days);

    if (new Date() < trialEndsAt) {
      return "trialing";
    }
  }

  if (subscription.status === "active") {
    return "active";
  }

  return subscription.status;
}

function resolveWorkspaceSubscriptionContext(input: {
  metadata?: Record<string, string>;
  workspaceId?: string | null;
  productId?: string;
}) {
  const metadata = input.metadata ?? {};
  const plan = parseCheckoutSubscriptionPlan(metadata.plan);
  const interval = parseCheckoutBillingInterval(metadata.interval);

  return {
    workspaceId: metadata.workspaceId ?? input.workspaceId ?? null,
    userId: metadata.userId,
    plan,
    interval,
    type: metadata.type,
  };
}

export async function applyWorkspaceSubscriptionFromDodo(input: {
  workspaceId: string;
  plan: SubscriptionPlanId;
  interval: BillingInterval;
  dodoCustomerId?: string | null;
  dodoSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
}) {
  return applyWorkspaceSubscriptionFromCheckout({
    workspaceId: input.workspaceId,
    plan: input.plan,
    interval: input.interval,
    billingProvider: "dodo",
    dodoCustomerId: input.dodoCustomerId,
    dodoSubscriptionId: input.dodoSubscriptionId,
    subscriptionStatus: input.subscriptionStatus,
  });
}

async function resolveWorkspaceSubscriptionPlanContext(subscription: Subscription) {
  const context = resolveWorkspaceSubscriptionContext({
    metadata: subscription.metadata,
  });

  if (context.plan && context.interval && context.workspaceId) {
    return context;
  }

  const workspaceId = context.workspaceId;
  if (!workspaceId) {
    return context;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, billingInterval: true },
  });

  if (!workspace) {
    return context;
  }

  return {
    ...context,
    workspaceId,
    plan: context.plan ?? parseCheckoutSubscriptionPlan(workspace.plan),
    interval: context.interval ?? parseCheckoutBillingInterval(workspace.billingInterval ?? undefined),
  };
}

export async function fulfillWorkspaceSubscriptionFromDodoSubscription(
  subscription: Subscription,
  checkoutUserId?: string | null,
) {
  const context = await resolveWorkspaceSubscriptionPlanContext(subscription);

  if (
    context.type !== WORKSPACE_SUBSCRIPTION_TYPE &&
    context.type !== undefined
  ) {
    return null;
  }

  if (!context.workspaceId) {
    throw new Error("Dodo subscription is missing workspace subscription metadata.");
  }

  if (!context.plan || !context.interval) {
    throw new Error("Dodo subscription is missing plan details.");
  }

  if (subscription.status === "cancelled" || subscription.status === "failed" || subscription.status === "expired") {
    return downgradeWorkspaceToFree(context.workspaceId);
  }

  const workspace = await applyWorkspaceSubscriptionFromDodo({
    workspaceId: context.workspaceId,
    plan: context.plan,
    interval: context.interval,
    dodoCustomerId: subscription.customer.customer_id,
    dodoSubscriptionId: subscription.subscription_id,
    subscriptionStatus: mapDodoSubscriptionStatus(subscription),
  });

  if (checkoutUserId) {
    await processReferralSubscriptionReward({
      referredUserId: checkoutUserId,
      referredWorkspaceId: context.workspaceId,
      plan: context.plan,
      stripeCheckoutSessionId: subscription.subscription_id,
      stripeSubscriptionId: subscription.subscription_id,
    });
  }

  return workspace;
}

async function verifyDodoCheckoutPayment(input: {
  sessionId?: string;
  paymentId?: string;
  workspaceId: string;
}) {
  const dodo = getDodo();

  if (input.sessionId) {
    const session = await dodo.checkoutSessions.retrieve(input.sessionId);
    const sessionMetadata = session.metadata ?? {};

    if (sessionMetadata.type !== WORKSPACE_SUBSCRIPTION_TYPE) {
      throw new Error("Not a workspace subscription checkout.");
    }

    if (sessionMetadata.workspaceId !== input.workspaceId) {
      throw new Error("Checkout session does not belong to this workspace.");
    }

    let payment: import("dodopayments/resources/payments.js").Payment | null = null;
    let subscriptionId: string | null = null;

    if (session.payment_id && session.payment_status === "succeeded") {
      payment = await dodo.payments.retrieve(session.payment_id);
      subscriptionId = payment.subscription_id ?? null;
    }

    if (!subscriptionId && "subscription_id" in session && typeof session.subscription_id === "string") {
      subscriptionId = session.subscription_id;
    }

    if (!subscriptionId) {
      throw new Error("Checkout is not complete yet.");
    }

    const subscription = await dodo.subscriptions.retrieve(subscriptionId);

    if (subscription.status !== "active" && subscription.status !== "on_hold") {
      throw new Error("Checkout is not complete yet.");
    }

    const metadata = payment?.metadata ?? sessionMetadata;

    return { payment, subscription, metadata };
  }

  if (!input.paymentId) {
    throw new Error("Missing Dodo checkout session or payment id.");
  }

  const payment = await dodo.payments.retrieve(input.paymentId);
  const metadata = payment.metadata ?? {};

  if (metadata.type !== WORKSPACE_SUBSCRIPTION_TYPE) {
    throw new Error("Not a workspace subscription checkout.");
  }

  if (metadata.workspaceId !== input.workspaceId) {
    throw new Error("Checkout payment does not belong to this workspace.");
  }

  if (payment.status !== "succeeded") {
    throw new Error("Checkout is not complete yet.");
  }

  if (!payment.subscription_id) {
    throw new Error("Checkout payment is missing a subscription.");
  }

  const subscription = await dodo.subscriptions.retrieve(payment.subscription_id);

  return { payment, subscription, metadata };
}

/** Poll until the Dodo webhook has applied the subscription — never apply the plan locally. */
export async function waitForDodoWorkspaceSubscriptionActivation(input: {
  sessionId?: string;
  paymentId?: string;
  workspaceId: string;
}): Promise<{
  workspace: {
    id: string;
    plan: string;
    creditsRemaining: number;
    billingInterval: string | null;
    subscriptionStatus: string | null;
  };
  purchase: SubscriptionPurchaseDetails;
}> {
  const maxVerifyAttempts = 5;
  let verified:
    | Awaited<ReturnType<typeof verifyDodoCheckoutPayment>>
    | null = null;
  let lastVerifyError: Error | null = null;

  for (let attempt = 0; attempt < maxVerifyAttempts; attempt += 1) {
    try {
      verified = await verifyDodoCheckoutPayment(input);
      break;
    } catch (error) {
      lastVerifyError = error instanceof Error ? error : new Error("Checkout verification failed.");
      const retryable =
        lastVerifyError.message.includes("not complete") && attempt < maxVerifyAttempts - 1;

      if (!retryable) {
        throw lastVerifyError;
      }

      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }

  if (!verified) {
    throw lastVerifyError ?? new Error("Checkout verification failed.");
  }

  const { payment, subscription, metadata } = verified;
  const context = resolveWorkspaceSubscriptionContext({
    metadata,
    productId: subscription.product_id,
  });

  if (!context.plan || !context.interval) {
    throw new Error("Checkout session is missing plan details.");
  }

  const expectedSubscriptionId = subscription.subscription_id;
  const maxPollAttempts = 30;

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: input.workspaceId },
      select: {
        id: true,
        plan: true,
        creditsRemaining: true,
        billingInterval: true,
        subscriptionStatus: true,
        dodoSubscriptionId: true,
      },
    });

    if (
      workspace &&
      workspace.plan !== "FREE" &&
      workspace.dodoSubscriptionId === expectedSubscriptionId
    ) {
      const purchase = purchaseDetailsFromDodoCheckout({
        planId: context.plan,
        interval: context.interval,
        creditsRemaining: workspace.creditsRemaining,
        subscription,
        payment,
      });

      return { workspace, purchase };
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    "Dodo has not confirmed your subscription yet. Your plan will activate shortly once payment is verified.",
  );
}

export async function syncWorkspaceSubscriptionFromDodoWebhook(subscription: Subscription) {
  const context = await resolveWorkspaceSubscriptionPlanContext(subscription);

  if (context.type && context.type !== WORKSPACE_SUBSCRIPTION_TYPE) {
    return null;
  }

  if (!context.workspaceId) {
    return null;
  }

  if (
    subscription.status === "cancelled" ||
    subscription.status === "failed" ||
    subscription.status === "expired"
  ) {
    return downgradeWorkspaceToFree(context.workspaceId);
  }

  if (subscription.status === "active" || subscription.status === "on_hold") {
    return fulfillWorkspaceSubscriptionFromDodoSubscription(subscription, context.userId);
  }

  return null;
}

export async function createDodoWorkspaceBillingPortalSession(input: {
  workspaceId: string;
  request: Request;
}) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { dodoCustomerId: true, billingProvider: true },
  });

  if (!workspace?.dodoCustomerId) {
    throw new Error("No billing account linked yet. Subscribe to a paid plan first.");
  }

  const appUrl = getOAuthAppUrl(input.request);
  const portal = await getDodo().customers.customerPortal.create(workspace.dodoCustomerId, {
    return_url: `${appUrl}/settings/billing`,
  });

  if (!portal.link) {
    throw new Error("Could not open billing portal.");
  }

  return { url: portal.link };
}
