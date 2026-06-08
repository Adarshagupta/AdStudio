import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }

    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }

  return stripeClient;
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  return secret;
}

export function formatPriceCents(priceCents: number, currency = "usd") {
  if (priceCents <= 0) {
    return "Free";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(priceCents / 100);
}
