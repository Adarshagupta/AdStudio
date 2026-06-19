import { NextResponse } from "next/server";

import { getDodo } from "@/lib/billing/dodo";
import { syncDodoSubscriptionRenewalFromWebhook } from "@/lib/billing/dodo-renewals";
import { syncWorkspaceSubscriptionFromDodoWebhook } from "@/lib/billing/dodo-workspace-subscription";
import type { WebhookPayload } from "dodopayments/resources/webhook-events.js";

const WORKSPACE_SUBSCRIPTION_TYPE = "workspace_subscription";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
  };

  let event: WebhookPayload;

  try {
    event = getDodo().webhooks.unwrap(rawBody, { headers }) as WebhookPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (
      event.type === "subscription.active" ||
      event.type === "subscription.updated" ||
      event.type === "subscription.on_hold" ||
      event.type === "subscription.cancelled" ||
      event.type === "subscription.failed" ||
      event.type === "subscription.expired"
    ) {
      await syncWorkspaceSubscriptionFromDodoWebhook(event.data as import("dodopayments/resources/subscriptions.js").Subscription);
    } else if (event.type === "subscription.renewed") {
      await syncDodoSubscriptionRenewalFromWebhook(event.data as import("dodopayments/resources/subscriptions.js").Subscription);
    } else if (event.type === "payment.succeeded") {
      const payment = event.data as import("dodopayments/resources/payments.js").Payment;
      if (!payment.subscription_id) {
        return NextResponse.json({ received: true });
      }

      if (payment.metadata?.renewal === "true") {
        const subscription = await getDodo().subscriptions.retrieve(payment.subscription_id);
        await syncDodoSubscriptionRenewalFromWebhook(subscription);
      } else if (payment.metadata?.type === WORKSPACE_SUBSCRIPTION_TYPE) {
        const subscription = await getDodo().subscriptions.retrieve(payment.subscription_id);
        await syncWorkspaceSubscriptionFromDodoWebhook(subscription);
      }
    }
  } catch (error) {
    console.error("[dodo-webhook] handler failed:", event.type, error);
    const message = error instanceof Error ? error.message : "Webhook handler failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
