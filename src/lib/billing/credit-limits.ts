import type { BillingInterval, SubscriptionPlanId } from "@/lib/billing/plans";
import { creditsForSubscription, planCreditAllocation, planGenerationLimits } from "@/lib/billing/plans";
import { isSubscriptionTrialStatus } from "@/lib/billing/subscription-trial";
import { WELCOME_CREDIT_BONUS } from "@/lib/billing/welcome-credits";

export function resolveBillingInterval(interval: string | null | undefined): BillingInterval {
  return interval === "yearly" ? "yearly" : "monthly";
}

export function isSubscriptionPlanId(plan: string): plan is SubscriptionPlanId {
  return plan in planCreditAllocation;
}

export function maxWalletCreditsForWorkspace(input: {
  plan: string;
  billingInterval?: string | null;
  subscriptionStatus?: string | null;
  welcomeCreditsClaimed?: boolean;
}): number {
  if (isSubscriptionTrialStatus(input.subscriptionStatus)) {
    return 0;
  }

  const planId: SubscriptionPlanId = isSubscriptionPlanId(input.plan) ? input.plan : "FREE";

  if (planId === "FREE") {
    return input.welcomeCreditsClaimed ? WELCOME_CREDIT_BONUS : 0;
  }

  return creditsForSubscription(planId, resolveBillingInterval(input.billingInterval));
}

export function clampCreditsToPlanCap(creditsRemaining: number, maxCredits: number): number {
  return Math.max(0, Math.min(creditsRemaining, maxCredits));
}

export function includedImageLimit(plan: string): number {
  const planId: SubscriptionPlanId = isSubscriptionPlanId(plan) ? plan : "FREE";
  return planGenerationLimits[planId].imageCount;
}

export function includedVideoMinutesLimit(plan: string): number {
  const planId: SubscriptionPlanId = isSubscriptionPlanId(plan) ? plan : "FREE";
  return planGenerationLimits[planId].videoMinutes;
}
