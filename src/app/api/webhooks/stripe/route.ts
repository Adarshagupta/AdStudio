import { NextResponse } from "next/server";

import { getStripe, getStripeWebhookSecret } from "@/lib/billing/stripe";
import { fulfillWorkspaceSubscriptionCheckoutSession, syncWorkspaceSubscriptionFromStripe } from "@/lib/billing/workspace-subscription";
import { fulfillTemplatePurchaseCheckoutSession } from "@/lib/studio-pro/template-marketplace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event;

  try {
    const stripe = getStripe();
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const workspaceId = session.metadata?.workspaceId;
      const userId = session.metadata?.userId;
      const checkoutType = session.metadata?.type;

      if (checkoutType === "workspace_subscription" && workspaceId) {
        await fulfillWorkspaceSubscriptionCheckoutSession(session);
      } else if (session.metadata?.listingId && workspaceId && userId && session.id) {
        await fulfillTemplatePurchaseCheckoutSession(session);
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      await syncWorkspaceSubscriptionFromStripe(event.data.object);
    } else if (event.type === "customer.subscription.deleted") {
      await syncWorkspaceSubscriptionFromStripe(event.data.object);
    }
  } catch (error) {
    console.error("[stripe-webhook] handler failed:", event.type, error);
    const message = error instanceof Error ? error.message : "Webhook handler failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
