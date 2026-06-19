import "server-only";

import { isDodoConfigured } from "@/lib/billing/dodo";
import { isDodoSubscriptionProductConfigured } from "@/lib/billing/dodo-subscription-product";
import { isStripeConfigured } from "@/lib/billing/stripe";

export type { BillingProviderId } from "@/lib/billing/payment-provider-shared";
export { getBillingProviderLabel } from "@/lib/billing/payment-provider-shared";

import type { BillingProviderId } from "@/lib/billing/payment-provider-shared";

export function getPrimaryBillingProvider(): BillingProviderId {
  const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();

  // When explicitly set to dodo, never silently fall back to Stripe.
  if (configured === "dodo") {
    return "dodo";
  }

  if (configured === "stripe" && isStripeConfigured()) {
    return "stripe";
  }

  if (isDodoConfigured() && isDodoSubscriptionProductConfigured()) {
    return "dodo";
  }

  if (isStripeConfigured()) {
    return "stripe";
  }

  return "none";
}

export function isPaidCheckoutEnabled() {
  const provider = getPrimaryBillingProvider();

  if (provider === "dodo") {
    return isDodoConfigured() && isDodoSubscriptionProductConfigured();
  }

  if (provider === "stripe") {
    return isStripeConfigured();
  }

  return false;
}

/** True when paid upgrades must go through checkout — never the subscribe API. */
export function requiresPaidCheckout() {
  if (getPrimaryBillingProvider() !== "none") {
    return true;
  }

  const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (configured === "dodo" || configured === "stripe") {
    return true;
  }

  return (
    isStripeConfigured() ||
    isDodoConfigured() ||
    isDodoSubscriptionProductConfigured()
  );
}

/**
 * Direct subscribe (no payment) is only allowed when no billing provider is configured.
 * Set ALLOW_DIRECT_PAID_SUBSCRIBE=true for local dev without payment keys.
 */
export function allowsDirectPaidSubscribe() {
  if (requiresPaidCheckout()) {
    return false;
  }

  return process.env.ALLOW_DIRECT_PAID_SUBSCRIBE === "true";
}

export function getPaidCheckoutUnavailableMessage() {
  const provider = getPrimaryBillingProvider();

  if (provider === "dodo") {
    if (!isDodoConfigured()) {
      return "Dodo Payments checkout is unavailable. DODO_PAYMENTS_API_KEY is not configured.";
    }
    if (!isDodoSubscriptionProductConfigured()) {
      return "Dodo Payments checkout is unavailable. DODO_SUBSCRIPTION_PRODUCT_ID is not configured.";
    }
  }

  if (provider === "stripe" && !isStripeConfigured()) {
    return "Stripe checkout is unavailable. Stripe API keys are not configured.";
  }

  return "Paid checkout is temporarily unavailable. Please try again later or contact support.";
}
