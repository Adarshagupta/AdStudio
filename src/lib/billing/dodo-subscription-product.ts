import "server-only";

import { planCheckoutPricing, type BillingInterval, type SubscriptionPlanId } from "@/lib/billing/plans";

/** Single on-demand subscription product in Dodo (create once in the Dodo dashboard). */
export function getDodoSubscriptionProductId() {
  return process.env.DODO_SUBSCRIPTION_PRODUCT_ID?.trim() || null;
}

export function isDodoSubscriptionProductConfigured() {
  return Boolean(getDodoSubscriptionProductId());
}

export function getDodoCheckoutPricing(plan: SubscriptionPlanId, interval: BillingInterval) {
  const pricing = planCheckoutPricing(plan, interval);
  if (!pricing) {
    return null;
  }

  return {
    unitAmountCents: pricing.unitAmountCents,
    label: pricing.label,
    recurringInterval: pricing.recurringInterval,
  };
}
