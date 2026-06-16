import type { BillingInterval, SubscriptionPlanId } from "@/lib/billing/plans";
import { creditsForSubscription } from "@/lib/billing/plans";

export const TRIAL_SUBSCRIPTION_STATUS = "trialing";

export function isSubscriptionTrialStatus(status: string | null | undefined): boolean {
  return status === TRIAL_SUBSCRIPTION_STATUS;
}

/** Premium wallet credits — zero during a free trial. */
export function walletCreditsForSubscription(
  plan: SubscriptionPlanId,
  interval: BillingInterval,
  subscriptionStatus: string | null | undefined,
): number {
  if (isSubscriptionTrialStatus(subscriptionStatus)) {
    return 0;
  }
  return creditsForSubscription(plan, interval);
}
