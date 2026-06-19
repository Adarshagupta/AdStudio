export type BillingInterval = "monthly" | "yearly";
export type SubscriptionPlanId = "FREE" | "STARTER" | "PRO" | "BUSINESS";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  badge?: string;
  monthlyPrice: number | null;
  monthlyCompareAt: number | null;
  yearlyPricePerMonth: number | null;
  yearlyCompareAtPerMonth: number | null;
  creditsLabel: string | null;
  creditsPerDollar: number | null;
  showTrial?: boolean;
  features: string[];
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "FREE",
    name: "Free",
    tagline: "Just trying things out",
    monthlyPrice: null,
    monthlyCompareAt: null,
    yearlyPricePerMonth: null,
    yearlyCompareAtPerMonth: null,
    creditsLabel: "0",
    creditsPerDollar: null,
    features: [
      "5 min video generation",
      "50 images",
      "5 team members",
      "20 GB storage",
      "Basic models only",
      "No premium models",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    tagline: "For creators starting their journey",
    monthlyPrice: 20,
    monthlyCompareAt: null,
    yearlyPricePerMonth: 16,
    yearlyCompareAtPerMonth: null,
    creditsLabel: "20",
    creditsPerDollar: 1,
    showTrial: true,
    features: [
      "1 hr video generation",
      "500 images",
      "10 team members",
      "50 GB storage",
      "$20 credits included",
      "Premium models via credits",
      "Social connect",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    tagline: "For active creators scaling up output",
    badge: "Most popular",
    monthlyPrice: 35,
    monthlyCompareAt: null,
    yearlyPricePerMonth: 28,
    yearlyCompareAtPerMonth: null,
    creditsLabel: "35",
    creditsPerDollar: 1,
    showTrial: true,
    features: [
      "3 hr video generation (priority)",
      "500 images (priority)",
      "20 team members",
      "500 GB storage",
      "$35 credits included",
      "Premium models via credits",
      "Social connect",
      "Priority queue",
    ],
  },
  {
    id: "BUSINESS",
    name: "Business",
    tagline: "For professionals producing content at scale",
    monthlyPrice: 100,
    monthlyCompareAt: null,
    yearlyPricePerMonth: 80,
    yearlyCompareAtPerMonth: null,
    creditsLabel: "100",
    creditsPerDollar: 1,
    showTrial: true,
    features: [
      "10 hr video generation (priority)",
      "Unlimited images (priority)",
      "20 team members",
      "500 GB storage",
      "$100 credits included",
      "Premium models via credits",
      "Social connect",
      "Priority queue",
      "Contact sales support",
    ],
  },
];

export const planCreditAllocation: Record<SubscriptionPlanId, number> = {
  FREE: 0,
  STARTER: 20,
  PRO: 35,
  BUSINESS: 100,
};

export const planGenerationLimits: Record<
  SubscriptionPlanId,
  { videoMinutes: number; imageCount: number; teamMembers: number; storageGB: number }
> = {
  FREE: { videoMinutes: 5, imageCount: 50, teamMembers: 5, storageGB: 20 },
  STARTER: { videoMinutes: 60, imageCount: 500, teamMembers: 10, storageGB: 50 },
  PRO: { videoMinutes: 180, imageCount: 500, teamMembers: 20, storageGB: 500 },
  BUSINESS: { videoMinutes: 600, imageCount: Infinity, teamMembers: 20, storageGB: 500 },
};

export const premiumModelCosts = {
  veo: { min: 0.14, max: 0.4, unit: "per second" },
  seedance: { min: 0.08, unit: "per second" },
  gptImage: { min: 0.01, unit: "per image" },
} as const;

export const baseGenerationCosts = {
  video: { perSecond: 0.03, includedInPlans: ["STARTER", "PRO", "BUSINESS"] as SubscriptionPlanId[] },
  image: { perImage: 0.001, includedInPlans: ["STARTER", "PRO", "BUSINESS"] as SubscriptionPlanId[] },
} as const;

export function formatPlanLabel(plan: string) {
  const match = subscriptionPlans.find((entry) => entry.id === plan);
  if (match) return match.name;
  if (plan === "FREE") return "Free";
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

export function getPlanPrice(plan: SubscriptionPlan, interval: BillingInterval) {
  if (plan.id === "FREE") return null;

  if (interval === "yearly") {
    return {
      amount: plan.yearlyPricePerMonth,
      compareAt: plan.yearlyCompareAtPerMonth,
      suffix: "/mo billed yearly",
    };
  }

  return {
    amount: plan.monthlyPrice,
    compareAt: plan.monthlyCompareAt,
    suffix: "/Monthly",
  };
}

export function creditsForSubscription(planId: SubscriptionPlanId, interval: BillingInterval) {
  const base = planCreditAllocation[planId];
  if (planId === "FREE") return base;
  return interval === "yearly" ? base * 12 : base;
}

export function planCheckoutPricing(planId: SubscriptionPlanId, interval: BillingInterval) {
  if (planId === "FREE") {
    return null;
  }

  const plan = subscriptionPlans.find((entry) => entry.id === planId);
  if (!plan) {
    return null;
  }

  if (interval === "yearly") {
    const monthly = plan.yearlyPricePerMonth ?? 0;
    return {
      unitAmountCents: monthly * 12 * 100,
      recurringInterval: "year" as const,
      label: `${plan.name} (yearly)`,
    };
  }

  return {
    unitAmountCents: (plan.monthlyPrice ?? 0) * 100,
    recurringInterval: "month" as const,
    label: `${plan.name} (monthly)`,
  };
}
